import { test, expect } from "@playwright/test";

test.describe("Create Organization Page", () => {
  test("renders organization creation form", async ({ page }) => {
    await page.goto("/create-org");
    await expect(page.getByText(/Create Your Organization/i)).toBeVisible();
  });

  test("has organization name input", async ({ page }) => {
    await page.goto("/create-org");
    await expect(page.getByLabel(/Organization Name/i)).toBeVisible();
  });

  test("has URL slug input", async ({ page }) => {
    await page.goto("/create-org");
    await expect(page.getByLabel(/URL Slug/i)).toBeVisible();
  });

  test("has admin email and password fields", async ({ page }) => {
    await page.goto("/create-org");
    await expect(page.getByLabel(/Admin Email/i)).toBeVisible();
    await expect(page.locator("#adminPassword")).toBeVisible();
  });

  test("has submit button", async ({ page }) => {
    await page.goto("/create-org");
    await expect(
      page.getByRole("button", { name: /Create Organization/i })
    ).toBeVisible();
  });
});

test.describe("Dashboard Hiring Page", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/hiring");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fhiring/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

test.describe("Dashboard Settings Page", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fsettings/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
