import { test, expect } from "@playwright/test";

test.describe("Weekly Progress API (unauthenticated)", () => {
  test("GET /api/weekly-progress returns 401", async ({ request }) => {
    const response = await request.get("/api/weekly-progress");
    expect(response.status()).toBe(401);
  });

  test("GET /api/weekly-progress/history returns 401", async ({ request }) => {
    const response = await request.get("/api/weekly-progress/history");
    expect(response.status()).toBe(401);
  });

  test("POST /api/weekly-progress returns 401", async ({ request }) => {
    const response = await request.post("/api/weekly-progress", {
      data: {
        accomplishments: "x",
        learningOutcomes: "x",
        challenges: "x",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/weekly-progress/fake-id/submit returns 401", async ({ request }) => {
    const response = await request.post("/api/weekly-progress/fake-id/submit");
    expect(response.status()).toBe(401);
  });

  test("GET /api/weekly-progress/review rejects without session", async ({ request }) => {
    const response = await request.get("/api/weekly-progress/review");
    expect([401, 403]).toContain(response.status());
  });

  test("PATCH /api/weekly-progress/fake-id/feedback rejects without session", async ({
    request,
  }) => {
    const response = await request.patch("/api/weekly-progress/fake-id/feedback", {
      data: { mentorFeedback: "Good work this week." },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Weekly Progress pages (unauthenticated)", () => {
  test("/weekly-progress prompts sign-in (middleware redirect or in-page CTA)", async ({
    page,
  }) => {
    await page.goto("/weekly-progress");
    if (page.url().includes("/sign-in")) {
      await expect(page.getByLabel("Email")).toBeVisible();
    } else {
      const main = page.locator("#main-content");
      await expect(main.getByRole("heading", { name: /^Weekly progress$/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(main.getByRole("link", { name: /^Sign in$/i })).toBeVisible();
    }
  });

  test("/dashboard/weekly-progress requires auth (redirect or admin gate)", async ({
    page,
  }) => {
    await page.goto("/dashboard/weekly-progress");
    if (page.url().includes("/sign-in")) {
      await expect(page.getByLabel("Email")).toBeVisible();
    } else {
      await expect(
        page
          .locator("#main-content")
          .getByRole("heading", { name: /Weekly progress review|Admin access required/i })
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("sign-in with redirect=/weekly-progress shows email field", async ({ page }) => {
    await page.goto("/sign-in?redirect=%2Fweekly-progress");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });
});

test.describe("Weekly Progress intern flow (optional credentials)", () => {
  test("intern can open weekly progress and save a draft when E2E_INTERN_* is set", async ({
    page,
  }) => {
    const email = process.env.E2E_INTERN_EMAIL?.trim();
    const password = process.env.E2E_INTERN_PASSWORD;
    test.skip(!email || !password, "Set E2E_INTERN_EMAIL and E2E_INTERN_PASSWORD to run this test");

    await page.goto("/sign-in?redirect=/weekly-progress");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/weekly-progress/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { name: /^Weekly progress$/i })).toBeVisible({
      timeout: 15_000,
    });

    const filler =
      "E2E weekly progress — accomplishments, learning, and challenges text (10+ chars).";
    await page.locator("#wp-accomplishments").fill(filler);
    await page.locator("#wp-learning").fill(filler);
    await page.locator("#wp-challenges").fill(filler);

    await page.getByRole("button", { name: /Save draft/i }).click();
    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 20_000 });
  });
});
