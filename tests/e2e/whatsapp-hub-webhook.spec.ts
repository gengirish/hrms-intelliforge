import { test, expect } from "@playwright/test";

/**
 * The WhatsApp webhook accepts two transports: events forwarded by the central
 * hub (identified by tenant header) and Meta's own signed callbacks. These
 * cover the rejection paths of both — a request that reaches intern lookup
 * would mutate offer state and send real replies.
 */

const TENANT = process.env.WHATSAPP_TENANT_ID ?? "hrms";

test.describe("hub-forwarded events", () => {
  test("rejects a mismatched tenant", async ({ request }) => {
    const response = await request.post("/api/webhooks/whatsapp", {
      headers: {
        "X-WhatsApp-Hub-Tenant": "some-other-tenant",
        "X-WhatsApp-Hub-Event": "inbound",
      },
      data: { type: "inbound", message: { fromE164: "+919999999999", text: "hi", type: "text" } },
    });

    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe("tenant_mismatch");
  });

  test("accepts the configured tenant with an empty payload", async ({ request }) => {
    // No message/status means nothing to look up, so this exercises the auth
    // and envelope handling without touching intern records.
    const response = await request.post("/api/webhooks/whatsapp", {
      headers: {
        "X-WhatsApp-Hub-Tenant": TENANT,
        "X-WhatsApp-Hub-Event": "inbound",
      },
      data: { type: "inbound" },
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  test("swallows a malformed forward instead of erroring back at the hub", async ({
    baseURL,
  }) => {
    // A 500 here would make the hub retry the same bad payload indefinitely.
    const response = await fetch(`${baseURL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WhatsApp-Hub-Tenant": TENANT,
      },
      body: "not-json",
    });

    expect(response.status).toBe(200);
  });
});

test.describe("Meta-signed callbacks", () => {
  test("still rejects an unsigned body when no hub header is present", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/whatsapp", {
      headers: { "Content-Type": "application/json" },
      data: { entry: [] },
    });

    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe("Invalid signature");
  });

  test("rejects a wrong signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/whatsapp", {
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      },
      data: { entry: [] },
    });

    expect(response.status()).toBe(403);
  });

  test("GET verification rejects a wrong verify token", async ({ request }) => {
    const response = await request.get(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=definitely-wrong&hub.challenge=12345"
    );

    expect(response.status()).toBe(403);
  });
});
