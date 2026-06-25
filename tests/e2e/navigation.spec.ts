import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("intern onboarding link navigates from homepage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start onboarding" }).scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await expect(page).toHaveURL(/\/intern-onboarding/, { timeout: 15_000 });
  });

  test("Start free CTA navigates to create-org", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start free — 5 interns" }).click();
    await expect(page).toHaveURL(/\/create-org/, { timeout: 15_000 });
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
      await expect(page.getByText(/Loading weekly progress/i)).toBeHidden({ timeout: 30_000 });
      await expect(
        page.locator("#main-content").getByRole("heading", { name: /^Weekly progress$/i })
      ).toBeVisible();
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
        page.getByRole("heading", { name: /Weekly progress review|Admin access required/i }),
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

  test("/pricing page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/pricing");
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

  test("/about page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/daily-plan page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/daily-plan");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/dashboard/attendance page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/dashboard/attendance");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("/accept-admin-invite page loads (not 404)", async ({ page }) => {
    const response = await page.goto("/accept-admin-invite");
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
