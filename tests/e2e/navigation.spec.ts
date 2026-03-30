import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("clicking Onboard card navigates to /onboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Get started/i }).click();
    await expect(page).toHaveURL(/\/onboard/);
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
    await page.goto("/onboard");
    await page.locator("nav").getByRole("link", { name: /IntelliForge/i }).click();
    await expect(page).toHaveURL("/");
  });
});
