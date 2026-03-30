import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test("mobile viewport shows hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hamburger = page.getByLabel(/navigation menu/i);
    await expect(hamburger).toBeVisible();
  });

  test("mobile hamburger menu opens and shows navigation links", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hamburger = page.getByLabel(/open navigation menu/i);
    await hamburger.click();
    const mobileNav = page.locator("#mobile-nav-menu");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByText("Onboard")).toBeVisible();
    await expect(mobileNav.getByText("Dashboard")).toBeVisible();
  });

  test("desktop viewport hides hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const hamburger = page.getByLabel(/navigation menu/i);
    await expect(hamburger).not.toBeVisible();
  });

  test("tablet viewport renders action card descriptions", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.getByText("Self-onboarding for new interns")).toBeVisible();
    await expect(page.getByText("Log daily attendance with punch-in/out")).toBeVisible();
    await expect(page.getByText("Submit weekly task logs")).toBeVisible();
  });
});
