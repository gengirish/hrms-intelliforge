import { test, expect } from "@playwright/test";
import { expectSignInRedirect } from "./helpers/auth";

test.describe("Dashboard auth gates", () => {
  test("unauthenticated visit to /dashboard redirects to /sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expectSignInRedirect(page, "/dashboard");
  });

  test("unauthenticated visit to /dashboard/hiring redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/hiring");
    await expectSignInRedirect(page, "/dashboard/hiring");
  });

  test("unauthenticated visit to /dashboard/settings redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await expectSignInRedirect(page, "/dashboard/settings");
  });
});
test.describe("Public marketing routes", () => {
  test("/about loads without authentication", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.locator("#about-hero-heading")).toBeVisible();
  });
});
