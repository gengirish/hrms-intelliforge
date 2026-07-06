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
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
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

test.describe("Weekly Progress mentor loop (optional credentials)", () => {
  test(
    "intern submits report then mentor opens review and saves feedback",
    async ({ page }) => {
      test.setTimeout(120_000);
      const internEmail = process.env.E2E_INTERN_EMAIL?.trim();
      const internPassword = process.env.E2E_INTERN_PASSWORD;
      const mentorEmail = (
        process.env.E2E_MENTOR_EMAIL ?? process.env.E2E_ADMIN_EMAIL
      )?.trim();
      const mentorPassword =
        process.env.E2E_MENTOR_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD;

      test.skip(
        !internEmail ||
          !internPassword ||
          !mentorEmail ||
          !mentorPassword,
        "Set E2E_INTERN_EMAIL, E2E_INTERN_PASSWORD, and E2E_MENTOR_EMAIL+E2E_MENTOR_PASSWORD (or E2E_ADMIN_EMAIL+E2E_ADMIN_PASSWORD)"
      );

      await page.setViewportSize({ width: 1280, height: 900 });

      const body =
        "E2E mentor loop — accomplishments, learning, and challenges (10+ chars).";
      const feedbackText = `Playwright mentor feedback ${Date.now()}. Good progress on the weekly report.`;

      // --- Intern: draft + submit for current week ---
      await page.goto("/sign-in?redirect=/weekly-progress");
      await page.getByLabel("Email").fill(internEmail!);
      await page.getByLabel("Password", { exact: true }).fill(internPassword!);
      await page.getByRole("button", { name: /Sign In/i }).click();
      await expect(page).toHaveURL(/\/weekly-progress/, { timeout: 45_000 });

      await page.locator("#wp-accomplishments").fill(body);
      await page.locator("#wp-learning").fill(body);
      await page.locator("#wp-challenges").fill(body);
      await page.getByRole("button", { name: /Save draft/i }).click();
      await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 20_000 });

      const submitBtn = page.getByRole("button", { name: /^Submit$/i });
      await expect(submitBtn).toBeVisible({ timeout: 10_000 });
      await submitBtn.click();
      await expect(
        page.getByText(/Weekly progress submitted|Already submitted/i)
      ).toBeVisible({
        timeout: 25_000,
      });

      // --- Sign out (desktop user menu) ---
      await page.getByRole("button", { name: /Open user menu/i }).click();
      await page.getByRole("menuitem", { name: /Sign out/i }).click();
      await expect(page.getByRole("link", { name: /^Sign In$/i }).first()).toBeVisible({
        timeout: 15_000,
      });

      // --- Mentor: review + feedback ---
      await page.goto("/sign-in?redirect=/dashboard/weekly-progress");
      await page.getByLabel("Email").fill(mentorEmail!);
      await page.getByLabel("Password", { exact: true }).fill(mentorPassword!);
      await page.getByRole("button", { name: /Sign In/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/weekly-progress/, { timeout: 45_000 });
      await expect(
        page.getByRole("heading", { name: /Weekly progress review/i })
      ).toBeVisible({ timeout: 15_000 });

      const emptyState = page.getByText(
        /No weekly progress reports for this week yet/i
      );
      const reviewBtn = page.getByRole("button", { name: "Review" }).first();
      await expect(emptyState.or(reviewBtn)).toBeVisible({ timeout: 45_000 });

      if (await emptyState.isVisible()) {
        test.skip(
          true,
          "Mentor sees no reports: ensure this intern is assigned to this mentor (mentorId) and status allows submit."
        );
      }

      await reviewBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.locator("#weekly-progress-mentor-feedback").fill(feedbackText);
      await page.getByRole("button", { name: /Save feedback/i }).click();
      await expect(page.getByText(/Feedback saved/i)).toBeVisible({ timeout: 25_000 });
    }
  );
});
