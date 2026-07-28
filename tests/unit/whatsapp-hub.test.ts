import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The module reads process.env at call time, so each test resets the env and
 * re-imports it. No test performs a real send — the fetch is always stubbed.
 */
const ENV_KEYS = [
  "WHATSAPP_HUB_URL",
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

async function loadModule() {
  return import("@/lib/whatsapp-hub");
}

describe("isWhatsAppHubConfigured", () => {
  it("is false without an API key", async () => {
    const { isWhatsAppHubConfigured } = await loadModule();
    expect(isWhatsAppHubConfigured()).toBe(false);
  });

  it("is true with only the API key, since the URL has a default", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    const { isWhatsAppHubConfigured } = await loadModule();
    expect(isWhatsAppHubConfigured()).toBe(true);
  });
});

describe("whatsAppHubTenantId", () => {
  it("defaults to hrms", async () => {
    const { whatsAppHubTenantId } = await loadModule();
    expect(whatsAppHubTenantId()).toBe("hrms");
  });

  it("honours WHATSAPP_TENANT_ID", async () => {
    process.env.WHATSAPP_TENANT_ID = "hrms-staging";
    const { whatsAppHubTenantId } = await loadModule();
    expect(whatsAppHubTenantId()).toBe("hrms-staging");
  });
});

describe("hub sends", () => {
  it("fails closed when the hub is not configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { hubSendText } = await loadModule();

    const result = await hubSendText("+919876543210", "hello");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends bearer auth and the tenant header", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    process.env.WHATSAPP_HUB_URL = "https://hub.example.com";
    process.env.WHATSAPP_TENANT_ID = "hrms";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, waMessageId: "wamid.123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { hubSendText } = await loadModule();
    const result = await hubSendText("+919876543210", "hello");

    expect(result).toEqual({ success: true, messageId: "wamid.123" });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hub.example.com/v1/messages/text");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer if_live_test");
    expect(headers["X-Tenant-Id"]).toBe("hrms");
  });

  it("reports the hub's error message on a rejected send", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "not_opted_in", message: "Recipient has not opted in" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { hubSendTemplate } = await loadModule();
    const result = await hubSendTemplate({
      to: "+919876543210",
      templateName: "offer_accepted",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Recipient has not opted in");
  });

  it("treats a network error as a failed send rather than throwing", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const { hubSendText } = await loadModule();
    const result = await hubSendText("+919876543210", "hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("ECONNRESET");
  });
});

describe("whatsapp.ts transport selection", () => {
  it("routes through the hub when configured, not graph.facebook.com", async () => {
    process.env.WHATSAPP_HUB_API_KEY = "if_live_test";
    process.env.WHATSAPP_HUB_URL = "https://hub.example.com";
    process.env.WHATSAPP_ACCESS_TOKEN = "meta-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, waMessageId: "wamid.hub" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { sendWhatsAppText } = await import("@/lib/whatsapp");
    const result = await sendWhatsAppText("9876543210", "hi");

    expect(result).toEqual({ success: true, messageId: "wamid.hub" });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("hub.example.com");
    expect(url).not.toContain("graph.facebook.com");

    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it("falls back to Meta Graph when the hub is unset", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "meta-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.meta" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { sendWhatsAppText } = await import("@/lib/whatsapp");
    const result = await sendWhatsAppText("9876543210", "hi");

    expect(result).toEqual({ success: true, messageId: "wamid.meta" });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("graph.facebook.com");

    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });
});
