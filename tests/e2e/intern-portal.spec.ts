import { test, expect } from "@playwright/test";
import { expectSignInRedirect } from "./helpers/auth";

test.describe("Intern Onboarding Page", () => {
  test("unauthenticated user redirects to sign-in", async ({ page }) => {
    await page.goto("/intern-onboarding");
    await expectSignInRedirect(page, "/intern-onboarding");
  });
});

test.describe("Intern portal gates (unauthenticated)", () => {
  test("/tasks redirects to sign-in", async ({ page }) => {
    await page.goto("/tasks");
    await expectSignInRedirect(page, "/tasks");
  });

  test("/attendance redirects to sign-in", async ({ page }) => {
    await page.goto("/attendance");
    await expectSignInRedirect(page, "/attendance");
  });

  test("/offer redirects to sign-in", async ({ page }) => {
    await page.goto("/offer");
    await expectSignInRedirect(page, "/offer");
  });

  test("/weekly-progress redirects to sign-in", async ({ page }) => {
    await page.goto("/weekly-progress");
    await expectSignInRedirect(page, "/weekly-progress");
  });

  test("/daily-plan redirects to sign-in", async ({ page }) => {
    await page.goto("/daily-plan");
    await expectSignInRedirect(page, "/daily-plan");
  });
});

test.describe("Footer quick links", () => {
  test("footer links redirect unauthenticated users to sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const footer = page.locator("footer");

    for (const { href, redirect } of [
      { href: "/intern-onboarding", redirect: "%2Fintern-onboarding" },
      { href: "/attendance", redirect: "%2Fattendance" },
      { href: "/tasks", redirect: "%2Ftasks" },
    ]) {
      await page.goto("/");
      const link = footer.locator(`a[href="${href}"]`);
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(new RegExp(`/sign-in\\?redirect=${redirect}`)),
        link.click(),
      ]);
    }
  });
});

test.describe("Intern portal API gates (unauthenticated)", () => {
  test("GET /api/tasks returns 401", async ({ request }) => {
    const response = await request.get("/api/tasks");
    expect(response.status()).toBe(401);
  });

  test("GET /api/attendance returns 401", async ({ request }) => {
    const response = await request.get("/api/attendance");
    expect(response.status()).toBe(401);
  });

  test("GET /api/offer returns 401", async ({ request }) => {
    const response = await request.get("/api/offer");
    expect(response.status()).toBe(401);
  });

  test("POST /api/intern-onboarding returns 401", async ({ request }) => {
    const response = await request.post("/api/intern-onboarding", {
      data: { name: "E2E Test" },
    });
    expect(response.status()).toBe(401);
  });
});
