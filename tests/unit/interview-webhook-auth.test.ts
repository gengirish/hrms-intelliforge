import { describe, expect, it } from "vitest";
import { verifyInterviewWebhookAuth } from "@/lib/interview-webhook-auth";

describe("verifyInterviewWebhookAuth", () => {
  const secret = "super-secret-webhook-key";

  it("returns 503 in production when secret is missing", () => {
    const result = verifyInterviewWebhookAuth(null, undefined, true);
    expect(result).toEqual({
      authorized: false,
      status: 503,
      message: "Webhook not configured",
    });
  });

  it("allows requests in non-production when secret is missing", () => {
    const result = verifyInterviewWebhookAuth(null, undefined, false);
    expect(result).toEqual({ authorized: true });
  });

  it("returns 401 when bearer token is wrong", () => {
    const result = verifyInterviewWebhookAuth(
      "Bearer wrong-token",
      secret,
      true
    );
    expect(result).toEqual({
      authorized: false,
      status: 401,
      message: "Unauthorized",
    });
  });

  it("returns 401 when authorization header is missing", () => {
    const result = verifyInterviewWebhookAuth(null, secret, true);
    expect(result).toEqual({
      authorized: false,
      status: 401,
      message: "Unauthorized",
    });
  });

  it("authorizes valid bearer token", () => {
    const result = verifyInterviewWebhookAuth(
      `Bearer ${secret}`,
      secret,
      true
    );
    expect(result).toEqual({ authorized: true });
  });
});
