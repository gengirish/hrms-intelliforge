import { test, expect } from "@playwright/test";

test.describe("Internships directory (public)", () => {
  test("/internships page loads with 200", async ({ page }) => {
    const response = await page.goto("/internships");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test("renders marketplace hero", async ({ page }) => {
    await page.goto("/internships");
    await expect(page.locator("h1")).toContainText("Internship");
    await expect(page.getByText("Internship Marketplace")).toBeVisible();
  });

  test("has search input for filtering listings", async ({ page }) => {
    await page.goto("/internships");
    await expect(
      page.getByPlaceholder(/Search by role, skill, or company/i),
    ).toBeVisible();
  });

  test("displays job cards or empty state", async ({ page }) => {
    await page.goto("/internships");
    const hasJobs = await page.locator(".internships-job-card").first().isVisible();
    const hasEmpty = await page
      .getByText(/No open internships right now/i)
      .isVisible();
    expect(hasJobs || hasEmpty).toBe(true);
  });

  test("navbar has Internships link on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/internships");
    const topNav = page.locator("nav[aria-label='Primary']");
    await expect(topNav.getByRole("link", { name: "Internships", exact: true })).toBeVisible();
  });

  test("clicking Internships in navbar navigates from homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page
      .locator("nav[aria-label='Primary']")
      .getByRole("link", { name: "Internships", exact: true })
      .click();
    await expect(page).toHaveURL(/\/internships/);
  });
});

test.describe("Internships detail page", () => {
  test("/internships/nonexistent shows not-found state", async ({ page }) => {
    await page.goto("/internships/nonexistent-id-12345");
    await expect(
      page.getByText(/Position Not Found|not found|doesn't exist/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("if listing exists, detail page renders title and apply action", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/internships");
    expect(res.status()).toBe(200);
    const body = await res.json();
    const job = body.jobs?.[0];
    if (!job?.slug) return;

    await page.goto(`/internships/${job.slug}`);
    await expect(page.locator("h1")).toContainText(job.title, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Apply Now/i })).toBeVisible();
  });

  test("if listing exists, Apply Now reveals application form", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/internships");
    const body = await res.json();
    const job = body.jobs?.[0];
    if (!job?.slug) return;

    await page.goto(`/internships/${job.slug}`);
    await page.getByRole("button", { name: /Apply Now/i }).click();
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit Application/i })).toBeVisible();
  });
});

test.describe("Internships API (public)", () => {
  test("GET /api/internships returns jobs array", async ({ request }) => {
    const response = await request.get("/api/internships");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("jobs");
    expect(Array.isArray(body.jobs)).toBe(true);
  });

  test("GET /api/internships mirrors careers API", async ({ request }) => {
    const [internshipsRes, careersRes] = await Promise.all([
      request.get("/api/internships"),
      request.get("/api/careers"),
    ]);
    expect(internshipsRes.status()).toBe(200);
    expect(careersRes.status()).toBe(200);
    const internshipsBody = await internshipsRes.json();
    const careersBody = await careersRes.json();
    expect(internshipsBody.jobs?.length ?? 0).toBe(careersBody.jobs?.length ?? 0);
  });

  test("GET /api/internships/nonexistent returns 404", async ({ request }) => {
    const response = await request.get("/api/internships/nonexistent-id-12345");
    expect(response.status()).toBe(404);
  });
});

test.describe("Careers redirect (backward compatible)", () => {
  test("/careers redirects to /internships", async ({ page }) => {
    await Promise.all([
      page.waitForURL(/\/internships\/?$/, { timeout: 20_000 }),
      page.goto("/careers"),
    ]);
  });

  test("/careers/slug redirects to /internships/slug", async ({ page, request }) => {
    const res = await request.get("/api/careers");
    const body = await res.json();
    const job = body.jobs?.[0];
    if (!job?.slug) return;

    await Promise.all([
      page.waitForURL(new RegExp(`/internships/${job.slug}`), { timeout: 20_000 }),
      page.goto(`/careers/${job.slug}`),
    ]);
  });
});
