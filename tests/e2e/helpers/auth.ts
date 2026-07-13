import { expect, type Page } from "@playwright/test";

/** Sign in via the /sign-in form and wait for redirect away from sign-in. */
export async function signInWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 20_000 });
}

export function getAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

/** Unauthenticated dashboard visit: middleware redirect or legacy in-page gate. */
export async function expectDashboardRequiresAuth(page: Page): Promise<void> {
  if (page.url().includes("/sign-in")) {
    await expect(page.getByLabel("Email")).toBeVisible();
    return;
  }

  const main = page.locator("#main-content");
  await expect(
    main.getByRole("heading", {
      name: /Dashboard|Admin access required|Sign In Required|Hiring Pipeline|Organization Settings|No Organization/i,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Strict: unauthenticated protected route must land on sign-in. */
export async function expectSignInRedirect(
  page: Page,
  redirectPath?: string,
): Promise<void> {
  if (redirectPath) {
    const encoded = encodeURIComponent(redirectPath).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?redirect=${encoded}`));
  } else {
    await expect(page).toHaveURL(/\/sign-in/);
  }
  await expect(page.getByLabel("Email")).toBeVisible();
}
