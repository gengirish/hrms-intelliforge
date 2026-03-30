import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("sign-in page loads successfully (not 404)", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-up page loads successfully (not 404)", async ({ page }) => {
    const response = await page.goto("/sign-up");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("unauthenticated user sees Sign In link on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  });

  test("sign-in page has IntelliForge branding", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText(/IntelliForge/i).first()).toBeVisible();
  });

  test("sign-up page has IntelliForge branding", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText(/IntelliForge/i).first()).toBeVisible();
  });

  test("sign-in page has email and password fields", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("sign-in page has Sign In submit button", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
  });

  test("sign-in page has Send Magic Link button", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /Magic Link/i })).toBeVisible();
  });

  test("sign-in page has link to sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    const signUpLink = page.getByRole("link", { name: /Sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  test("sign-up page has all registration fields", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Account Type")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
  });

  test("sign-up page has Create Account submit button", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("button", { name: /Create Account/i })).toBeVisible();
  });

  test("sign-up page has link to sign-in", async ({ page }) => {
    await page.goto("/sign-up");
    const signInLink = page.getByRole("link", { name: /Sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("Sign In navbar link navigates to /sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.getByRole("link", { name: "Sign In" }).first().click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-up account type defaults to Intern", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByLabel("Account Type")).toHaveValue("intern");
  });

  test("sign-in page has Forgot password link", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("link", { name: /Forgot password/i })).toBeVisible();
  });
});
