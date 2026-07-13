import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test("mobile viewport shows hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hamburger = page.getByLabel(/navigation menu/i);
    await expect(hamburger).toBeVisible();
  });

  test("mobile hamburger menu opens and shows marketplace navigation links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hamburger = page.getByLabel(/open navigation menu/i);
    await hamburger.click();
    const mobileNav = page.locator("#mobile-nav-drawer");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Internships", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Mentors", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "About", exact: true })).toBeVisible();
  });

  test("desktop viewport hides hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const hamburger = page.getByLabel(/navigation menu/i);
    await expect(hamburger).not.toBeVisible();
  });

  test("tablet viewport renders homepage marketplace features", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mentor discovery", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internship listings", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stipend payouts", exact: true })).toBeVisible();
  });
});
