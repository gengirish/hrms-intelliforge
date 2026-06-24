import { test, expect } from "@playwright/test";

test.describe("About Page", () => {
  test("/about page loads with 200", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("renders hero heading and Bharat AI Mission mention", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("#about-hero-heading")).toContainText(/Built for the AI age/i);
    await expect(page.getByText(/Bharat AI Mission/i).first()).toBeVisible();
  });

  test("has Get Started CTA linking to sign-in", async ({ page }) => {
    await page.goto("/about");
    const cta = page.getByRole("link", { name: /Get Started/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/sign-in");
  });

  test("is accessible without authentication", async ({ page }) => {
    await page.goto("/about");
    await expect(page).not.toHaveURL(/\/sign-in/);
  });
});

test.describe("About Navigation", () => {
  test("navbar About link navigates from homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await Promise.all([
      page.waitForURL(/\/about/),
      page
        .locator("nav[aria-label='Primary']")
        .getByRole("link", { name: "About", exact: true })
        .click(),
    ]);
    await expect(page.locator("#about-hero-heading")).toBeVisible();
  });

  test("mobile nav includes About link", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByLabel(/open navigation menu/i).click();
    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer.getByRole("link", { name: "About", exact: true })).toBeVisible();
  });
});
