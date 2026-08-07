import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "OTP_API_KEY",
  "OTP_SERVICE_URL",
  "OTP_TENANT_ID",
  "WHATSAPP_HUB_API_KEY",
  "WHATSAPP_TENANT_ID",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  vi.resetModules();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("normalizePhoneE164", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["+919876543210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    // Non-Indian numbers are only accepted already-clean: the E.164 regex tests
    // the raw string, so separators are stripped for +91 forms but not others.
    ["+14155550132", "+14155550132"],
  ])("normalizes %s", async (input, expected) => {
    const { normalizePhoneE164 } = await import("@/lib/otp");
    expect(normalizePhoneE164(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["12345"],
    ["not-a-phone"],
    ["+1 415 555 0132"], // spaced international — see note above
    [null],
    [undefined],
  ])(
    "rejects %s",
    async (input) => {
      const { normalizePhoneE164 } = await import("@/lib/otp");
      expect(normalizePhoneE164(input as string | null | undefined)).toBeNull();
    }
  );
});

describe("isOtpConfigured", () => {
  it("is false with no key at all", async () => {
    const { isOtpConfigured } = await import("@/lib/otp");
    expect(isOtpConfigured()).toBe(false);
  });

  it("is true with OTP_API_KEY", async () => {
    process.env.OTP_API_KEY = "if_live_test";
    const { isOtpConfigured } = await import("@/lib/otp");
    expect(isOtpConfigured()).toBe(true);
  });

  it("falls back to the WhatsApp hub key, since one key serves both", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    const { isOtpConfigured } = await import("@/lib/otp");
    expect(isOtpConfigured()).toBe(true);
  });
});

describe("phoneSuffix10", () => {
  it.each([
    ["+919876543210", "9876543210"],
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["+91-98765-43210", "9876543210"],
    ["09876543210", "9876543210"],
  ])("reduces %s to the subscriber digits", async (input, expected) => {
    const { phoneSuffix10 } = await import("@/lib/otp");
    expect(phoneSuffix10(input)).toBe(expected);
  });

  it("strips separators the old leading-+ slice would have kept", async () => {
    const { phoneSuffix10 } = await import("@/lib/otp");
    // "+91 98765 43210".replace(/^\+/,"").slice(-10) === "8765 43210"
    expect(phoneSuffix10("+91 98765 43210")).toBe("9876543210");
  });
});

describe("resolveInternByPhone", () => {
  const intern = (
    id: string,
    status: "PENDING" | "OFFERED" | "ACTIVE" | "COMPLETED",
    deactivated = false
  ) => ({
    id,
    email: `${id}@example.com`,
    name: id,
    orgId: "org1",
    status,
    deactivated,
  });

  it("returns none for no matches", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    expect(resolveInternByPhone([])).toEqual({ kind: "none" });
  });

  it("resolves a single ACTIVE intern", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([intern("a", "ACTIVE")]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "a" } });
  });

  it("prefers the ACTIVE intern over an archived COMPLETED one on the same number", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([
      intern("old", "COMPLETED"),
      intern("live", "ACTIVE"),
    ]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "live" } });
  });

  it("prefers ACTIVE over PENDING and OFFERED too", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([
      intern("p", "PENDING"),
      intern("o", "OFFERED"),
      intern("live", "ACTIVE"),
    ]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "live" } });
  });

  it("still refuses when two ACTIVE interns genuinely tie", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    expect(
      resolveInternByPhone([intern("a", "ACTIVE"), intern("b", "ACTIVE")])
    ).toEqual({ kind: "ambiguous", count: 2 });
  });

  it("lets a COMPLETED alum sign in when nothing else claims the number", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([intern("alum", "COMPLETED")]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "alum" } });
  });

  it("refuses two non-ACTIVE matches, since there is no ACTIVE to prefer", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    expect(
      resolveInternByPhone([intern("a", "COMPLETED"), intern("b", "OFFERED")])
    ).toEqual({ kind: "ambiguous", count: 2 });
  });

  it("never signs in a deactivated intern", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    expect(resolveInternByPhone([intern("gone", "ACTIVE", true)])).toEqual({
      kind: "none",
    });
  });

  it("ignores a deactivated intern blocking a live one", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([
      intern("gone", "ACTIVE", true),
      intern("live", "ACTIVE"),
    ]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "live" } });
  });

  it("does not let a deactivated ACTIVE row suppress the COMPLETED fallback", async () => {
    const { resolveInternByPhone } = await import("@/lib/otp");
    const res = resolveInternByPhone([
      intern("gone", "ACTIVE", true),
      intern("alum", "COMPLETED"),
    ]);
    expect(res).toMatchObject({ kind: "ok", intern: { id: "alum" } });
  });
});

describe("requestLoginOtp", () => {
  it("throws rather than silently no-opping when unconfigured", async () => {
    const { requestLoginOtp } = await import("@/lib/otp");
    await expect(requestLoginOtp("+919876543210")).rejects.toThrow(/not configured/i);
  });

  it("sends bearer auth, tenant header and the login purpose", async () => {
    process.env.OTP_API_KEY = "if_live_test";
    process.env.OTP_SERVICE_URL = "https://otp.example.com";
    process.env.OTP_TENANT_ID = "hrms";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sent: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { requestLoginOtp } = await import("@/lib/otp");
    const { status, body } = await requestLoginOtp("+919876543210");

    expect(status).toBe(200);
    expect(body.sent).toBe(true);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://otp.example.com/v1/otp/request");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer if_live_test");
    expect(headers["X-Tenant-Id"]).toBe("hrms");
    expect(JSON.parse(init.body as string)).toMatchObject({
      phone: "+919876543210",
      purpose: "login",
      channel: "whatsapp",
    });
  });
});
