import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("sign-in page loads successfully (not 404)", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-up page loads successfully (not 404)", async ({ page }) => {
    const response = await page.goto("/sign-up");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("unauthenticated user sees Sign In button on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign In" }).first()).toBeVisible();
  });

  test("sign-in page has IntelliForge branding", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText(/IntelliForge/i).first()).toBeVisible();
  });

  test("sign-up page has IntelliForge branding", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText(/IntelliForge/i).first()).toBeVisible();
  });
});
