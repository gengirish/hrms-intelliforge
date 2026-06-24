import { test, expect } from "@playwright/test";

test.describe("Intern Onboarding Page", () => {
  test("unauthenticated user sees sign-in gate", async ({ page }) => {
    await page.goto("/intern-onboarding");
    await expect(
      page.getByRole("heading", { name: /Sign In Required/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#main-content").getByRole("link", { name: /^sign in$/i })).toBeVisible();
  });
});

test.describe("Intern portal gates (unauthenticated)", () => {
  test("/tasks shows weekly tasks onboarding gate", async ({ page }) => {
    await page.goto("/tasks");
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: /Weekly Tasks/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(main.getByRole("link", { name: /Go to onboarding/i })).toBeVisible();
  });

  test("/attendance shows attendance onboarding gate", async ({ page }) => {
    await page.goto("/attendance");
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: /^Attendance$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(main.getByRole("link", { name: /Go to onboarding/i })).toBeVisible();
  });

  test("/offer resolves without server error", async ({ page }) => {
    const response = await page.goto("/offer");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page.locator("#main-content")).toBeVisible();
  });
});

test.describe("Footer quick links", () => {
  test("footer links reach intern portal pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");

    await footer.getByRole("link", { name: "Intern Onboarding" }).click();
    await expect(page).toHaveURL(/\/intern-onboarding/);

    await page.goto("/");
    await footer.getByRole("link", { name: "Attendance" }).click();
    await expect(page).toHaveURL(/\/attendance/);

    await page.goto("/");
    await footer.getByRole("link", { name: "Tasks" }).click();
    await expect(page).toHaveURL(/\/tasks/);
  });
});
