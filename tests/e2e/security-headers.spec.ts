import { test, expect } from "@playwright/test";

test.describe("Security Headers", () => {
  test("should include X-Frame-Options: DENY", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-frame-options"]).toBe("DENY");
  });

  test("should include X-Content-Type-Options: nosniff", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("should include Referrer-Policy", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("should include Permissions-Policy", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });

  test("should NOT include X-Powered-By header", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-powered-by"]).toBeUndefined();
  });
});
