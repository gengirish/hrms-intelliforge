import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("clicking Onboard card navigates to /intern-onboarding", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Get started/i }).click();
    await expect(page).toHaveURL(/\/intern-onboarding/);
  });

  test("clicking Attendance card navigates to /attendance", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Log now/i }).click();
    await expect(page).toHaveURL(/\/attendance/);
  });

  test("clicking Tasks card navigates to /tasks", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /View tasks/i }).click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("navbar brand links to homepage", async ({ page }) => {
    await page.goto("/intern-onboarding");
    await page.locator("nav").getByRole("link", { name: /IntelliForge/i }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Page Load", () => {
  test("/intern-onboarding page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/intern-onboarding");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/attendance page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/attendance");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/tasks page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/tasks");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/weekly-progress resolves (unauthenticated: sign-in redirect or gate)", async ({
    page,
  }) => {
    const response = await page.goto("/weekly-progress");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    if (page.url().includes("/sign-in")) {
      await expect(page.getByLabel("Email")).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: /^Weekly progress$/i })).toBeVisible();
    }
  });

  test("/dashboard/weekly-progress resolves (unauthenticated: sign-in redirect or gate)", async ({
    page,
  }) => {
    const response = await page.goto("/dashboard/weekly-progress");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    if (page.url().includes("/sign-in")) {
      await expect(page.getByLabel("Email")).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: /Weekly progress review|Admin access required/i })
      ).toBeVisible();
    }
  });

  test("/offer page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/offer");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/dashboard page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/dashboard");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/create-org page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/create-org");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/dashboard/hiring page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/dashboard/hiring");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/dashboard/settings page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/dashboard/settings");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/reset-password page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/reset-password");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });
});

test.describe("Error Handling", () => {
  test("non-existent page returns 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
  });
});
