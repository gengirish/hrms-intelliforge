import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("intern onboarding link redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start onboarding" }).scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fintern-onboarding/, { timeout: 15_000 });
  });

  test("Start free CTA navigates to create-org", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start free — 5 interns" }).click();
    await expect(page).toHaveURL(/\/create-org/, { timeout: 15_000 });
  });

  test("navbar brand links to homepage", async ({ page }) => {
    await page.goto("/about");
    await page.locator("nav").getByRole("link", { name: /IntelliForge/i }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Page Load", () => {
  test("/intern-onboarding redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/intern-onboarding");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fintern-onboarding/);
  });

  test("/attendance redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fattendance/);
  });

  test("/tasks redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Ftasks/);
  });

  test("/weekly-progress redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/weekly-progress");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fweekly-progress/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("/dashboard/weekly-progress redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/weekly-progress");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fweekly-progress/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("/offer redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/offer");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Foffer/);
  });

  test("/dashboard redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);
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

  test("/dashboard/hiring redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/hiring");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fhiring/);
  });

  test("/dashboard/settings redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fsettings/);
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

  test("/daily-plan redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/daily-plan");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdaily-plan/);
  });

  test("/dashboard/attendance redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/attendance");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard%2Fattendance/);
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
