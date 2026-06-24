import { test, expect } from "@playwright/test";

test.describe("Daily Plan page (unauthenticated)", () => {
  test("/daily-plan loads with 200", async ({ page }) => {
    const response = await page.goto("/daily-plan");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("unauthenticated user sees onboarding gate", async ({ page }) => {
    await page.goto("/daily-plan");
    await expect(page.getByText(/Loading daily plan/i)).toBeHidden({ timeout: 30_000 });
    await expect(
      page.locator("#main-content").getByRole("heading", { name: /Daily Task Plan/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("link", { name: /Go to onboarding/i })
    ).toBeVisible();
  });

  test("footer Daily Plan link navigates to /daily-plan", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Daily Plan" }).click();
    await expect(page).toHaveURL(/\/daily-plan/);
  });
});

test.describe("Daily Plan intern flow (optional credentials)", () => {
  test("intern can add a task and submit daily plan when E2E_INTERN_* is set", async ({
    page,
  }) => {
    const email = process.env.E2E_INTERN_EMAIL?.trim();
    const password = process.env.E2E_INTERN_PASSWORD;
    test.skip(!email || !password, "Set E2E_INTERN_EMAIL and E2E_INTERN_PASSWORD to run this test");

    await page.goto("/sign-in?redirect=/daily-plan");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/daily-plan/, { timeout: 45_000 });

    const onboardingGate = page.getByRole("link", { name: /Go to onboarding/i });
    const planHeading = page.getByRole("heading", { name: /Daily Task Plan/i });
    await expect(onboardingGate.or(planHeading)).toBeVisible({ timeout: 15_000 });

    if (await onboardingGate.isVisible()) {
      test.skip(true, "Intern account needs completed onboarding for daily plan flow");
    }

    const addTaskBtn = page.getByRole("button", { name: /Add Task/i });
    await expect(addTaskBtn).toBeVisible({ timeout: 10_000 });

    const alreadySubmitted = page.getByText(/Plan submitted for today/i);
    if (await alreadySubmitted.isVisible()) {
      await expect(planHeading).toBeVisible();
      return;
    }

    await addTaskBtn.click();
    await page.locator("#daily-plan-title").fill(`E2E task ${Date.now()}`);
    await page.getByRole("button", { name: /Add to plan/i }).click();
    await expect(page.getByText(/E2E task/i).first()).toBeVisible({ timeout: 15_000 });

    const submitBtn = page.getByRole("button", { name: /Submit daily plan/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(page.getByText(/Plan submitted for today|Daily plan submitted/i)).toBeVisible({
        timeout: 20_000,
      });
    }
  });
});
