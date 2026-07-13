import { test, expect } from "@playwright/test";
import { expectSignInRedirect, getAdminCredentials, signInWithCredentials } from "./helpers/auth";

test.describe("Marketplace dashboard auth gates", () => {
  test("/dashboard/marketplace redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/marketplace");
    await expectSignInRedirect(page, "/dashboard/marketplace");
  });

  test("/dashboard/mentor-profile redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/mentor-profile");
    await expectSignInRedirect(page, "/dashboard/mentor-profile");
  });
});

test.describe("Marketplace API (unauthenticated)", () => {
  test("GET /api/marketplace/transactions requires admin auth", async ({ request }) => {
    const response = await request.get("/api/marketplace/transactions");
    expect(response.status()).toBe(401);
  });

  test("GET /api/mentors/payout-profile requires auth", async ({ request }) => {
    const response = await request.get("/api/mentors/payout-profile");
    expect(response.status()).toBe(401);
  });

  test("POST /api/mentors/payout-profile requires auth", async ({ request }) => {
    const response = await request.post("/api/mentors/payout-profile", {
      data: { type: "vpa", address: "test@upi" },
    });
    expect([401, 400]).toContain(response.status());
  });
});

test.describe("Marketplace admin flows (optional credentials)", () => {
  test("admin can open mentor profile editor when E2E_ADMIN_* is set", async ({
    page,
  }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test");

    await signInWithCredentials(page, creds!.email, creds!.password);
    await page.goto("/dashboard/mentor-profile");
    await expect(page.getByRole("heading", { name: "Mentor Profile" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Program directory")).toBeVisible();
    await expect(page.getByLabel("Headline")).toBeVisible();
  });

  test("admin can open marketplace revenue page when E2E_ADMIN_* is set", async ({
    page,
  }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test");

    await signInWithCredentials(page, creds!.email, creds!.password);
    await page.goto("/dashboard/marketplace");
    await expect(page.getByRole("heading", { name: /Platform fees/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Platform fees|Gross payouts/i).first()).toBeVisible();
  });

  test("settings shows usage limits when E2E_ADMIN_* is set", async ({ page }) => {
    const creds = getAdminCredentials();
    test.skip(!creds, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test");

    await signInWithCredentials(page, creds!.email, creds!.password);
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Plan usage")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Platform fee")).toBeVisible();
  });
});
