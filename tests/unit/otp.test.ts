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
