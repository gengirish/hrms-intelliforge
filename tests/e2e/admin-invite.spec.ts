import { test, expect } from "@playwright/test";

test.describe("Accept Admin Invite Page", () => {
  test("/accept-admin-invite loads with 200", async ({ page }) => {
    const response = await page.goto("/accept-admin-invite");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("missing token shows invalid invite state", async ({ page }) => {
    await page.goto("/accept-admin-invite");
    await expect(
      page.getByRole("heading", { name: /Invalid or expired invite/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /^Sign in$/i })).toBeVisible();
  });

  test("invalid token shows invalid invite state", async ({ page }) => {
    await page.goto("/accept-admin-invite?t=invalid-token-e2e");
    await expect(
      page.getByRole("heading", { name: /Invalid or expired invite/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Reset Password Page", () => {
  test("/reset-password loads forgot-password form", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText(/Reset your password/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Reset Link/i })).toBeVisible();
  });

  test("reset-password with token shows new password fields", async ({ page }) => {
    await page.goto("/reset-password?token=fake-token&email=test@example.com");
    await expect(page.getByText(/Set your new password/i)).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-new")).toBeVisible();
    await expect(page.getByRole("button", { name: /Reset Password/i })).toBeVisible();
  });
});

test.describe("Admin invite API (public preview)", () => {
  test("GET /api/org/admins/invite/preview without token returns invalid", async ({
    request,
  }) => {
    const response = await request.get("/api/org/admins/invite/preview");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });

  test("GET /api/org/admins/invite/preview with bad token returns invalid", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/org/admins/invite/preview?t=not-a-real-invite-token"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });
});
