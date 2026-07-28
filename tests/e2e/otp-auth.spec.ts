import { test, expect } from "@playwright/test";

/**
 * Validation and rejection paths only. A well-formed number belonging to a real
 * intern makes the route call the hosted OTP API for real, which sends a
 * WhatsApp message and burns rate limit — do not add a happy-path test here.
 */

const HAS_OTP_KEY =
  (process.env.OTP_API_KEY ?? process.env.WHATSAPP_HUB_API_KEY ?? "") !== "";

test.describe("POST /api/auth/otp/request", () => {
  test("rejects a missing phone", async ({ request }) => {
    const response = await request.post("/api/auth/otp/request", { data: {} });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_phone");
  });

  test("rejects a too-short number", async ({ request }) => {
    const response = await request.post("/api/auth/otp/request", {
      data: { phone: "12345" },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_phone");
  });

  test("rejects a malformed body", async ({ baseURL }) => {
    const response = await fetch(`${baseURL}/api/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_phone");
  });

  test("reports a structured 503 when the OTP API is unconfigured", async ({
    request,
  }) => {
    test.skip(HAS_OTP_KEY, "only meaningful when the OTP API is unconfigured");

    // Safe to send a valid shape: unconfigured means it never reaches the API.
    const response = await request.post("/api/auth/otp/request", {
      data: { phone: "+919999999999" },
    });

    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("otp_not_configured");
    expect(body.message).toBeTruthy();
  });
});

test.describe("POST /api/auth/otp/verify", () => {
  test("rejects a missing code", async ({ request }) => {
    const response = await request.post("/api/auth/otp/verify", {
      data: { phone: "+919999999999" },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_request");
  });

  test("rejects a missing phone", async ({ request }) => {
    const response = await request.post("/api/auth/otp/verify", {
      data: { code: "123456" },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_request");
  });

  test("never issues a session cookie on a rejected request", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/otp/verify", {
      data: { phone: "12345", code: "000000" },
    });

    expect(response.ok()).toBe(false);
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).not.toContain("hrms-session");
  });
});
