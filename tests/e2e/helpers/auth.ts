import { expect, type Page } from "@playwright/test";

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
