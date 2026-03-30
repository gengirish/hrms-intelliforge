import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should render hero section with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("IntelliForge HRMS");
    await expect(page.locator("h1")).toContainText("Intern Portal");
  });

  test("should display all three action cards with descriptions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Self-onboarding for new interns")).toBeVisible();
    await expect(page.getByText("Log daily attendance with punch-in/out")).toBeVisible();
    await expect(page.getByText("Submit weekly task logs")).toBeVisible();
  });

  test("should have working navigation links in navbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const topNav = page.locator("nav").first();
    await expect(topNav.getByText("Home", { exact: true })).toBeVisible();
    await expect(topNav.getByText("Onboard", { exact: true })).toBeVisible();
    await expect(topNav.getByText("Dashboard", { exact: true })).toBeVisible();
  });

  test("should have Start Onboarding CTA link", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Start Onboarding" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/onboard");
  });

  test("should have Admin Dashboard CTA link", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Admin Dashboard" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/dashboard");
  });

  test("should show Sign In link when not authenticated", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  });

  test("should have footer visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("should display hero subtitle text", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Streamlined onboarding, attendance tracking")).toBeVisible();
  });
});
