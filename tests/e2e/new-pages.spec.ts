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
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test("has submit button", async ({ page }) => {
    await page.goto("/create-org");
    await expect(
      page.getByRole("button", { name: /Create Organization/i })
    ).toBeVisible();
  });
});

test.describe("Dashboard Hiring Page", () => {
  test("loads without error", async ({ page }) => {
    const response = await page.goto("/dashboard/hiring");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("has hiring-related heading", async ({ page }) => {
    await page.goto("/dashboard/hiring");
    await expect(
      page.getByText(/Hiring|Jobs|Pipeline|Candidates/i).first()
    ).toBeVisible();
  });
});

test.describe("Dashboard Settings Page", () => {
  test("loads without error", async ({ page }) => {
    const response = await page.goto("/dashboard/settings");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("has settings-related heading", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(
      page.getByText(/Settings|Organization|Configuration/i).first()
    ).toBeVisible();
  });
});
