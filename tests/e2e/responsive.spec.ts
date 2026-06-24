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
    const mobileNav = page.locator("#mobile-nav-drawer");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Careers", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "About", exact: true })).toBeVisible();
  });

  test("desktop viewport hides hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const hamburger = page.getByLabel(/navigation menu/i);
    await expect(hamburger).not.toBeVisible();
  });

  test("tablet viewport renders homepage feature section", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.getByText("Self-serve onboarding")).toBeVisible();
    await expect(page.getByText("Attendance that sticks")).toBeVisible();
    await expect(page.getByText("Offer letters on autopilot")).toBeVisible();
  });
});
