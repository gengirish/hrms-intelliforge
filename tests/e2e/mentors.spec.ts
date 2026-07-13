import { test, expect } from "@playwright/test";

test.describe("Mentors directory (public)", () => {
  test("/mentors page loads with 200", async ({ page }) => {
    const response = await page.goto("/mentors");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test("renders program mentors hero", async ({ page }) => {
    await page.goto("/mentors");
    await expect(page.locator("#main-content h1")).toContainText("program mentors", {
      timeout: 15_000,
    });
    await expect(page.getByText("Program mentors")).toBeVisible();
  });

  test("has mentor search input", async ({ page }) => {
    await page.goto("/mentors");
    await expect(
      page.getByPlaceholder(/Search by name, headline, or skill/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows mentor cards or empty state", async ({ page }) => {
    await page.goto("/mentors");
    await expect(page.locator("#main-content h1")).toContainText("program mentors", {
      timeout: 15_000,
    });
    const hasMentors = await page.getByText(/\d+ mentors? available/i).isVisible();
    const hasEmpty = await page
      .getByText(/No mentors found/i)
      .isVisible();
    expect(hasMentors || hasEmpty).toBe(true);
  });

  test("navbar has Mentors link on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/mentors");
    const topNav = page.locator("nav[aria-label='Primary']");
    await expect(topNav.getByRole("link", { name: "Mentors", exact: true })).toBeVisible();
  });

  test("clicking Mentors in navbar navigates from homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page
      .locator("nav[aria-label='Primary']")
      .getByRole("link", { name: "Mentors", exact: true })
      .click();
    await expect(page).toHaveURL(/\/mentors/);
  });
});

test.describe("Mentor detail page", () => {
  test("/mentors/nonexistent shows not-found state", async ({ page }) => {
    await page.goto("/mentors/nonexistent-mentor-slug-12345");
    await expect(page.getByRole("heading", { name: "Mentor Not Found" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /Browse Mentors/i })).toBeVisible();
  });

  test("if public mentor exists, detail page shows booking form", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/mentors");
    expect(res.status()).toBe(200);
    const body = await res.json();
    const mentor = body.mentors?.[0];

    if (!mentor?.slug) return;

    await page.goto(`/mentors/${mentor.slug}`);
    await expect(page.getByRole("heading", { name: "Book a Session" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Your Name *")).toBeVisible();
    await expect(page.getByRole("button", { name: /Request Session/i })).toBeVisible();
  });

  test("if public mentor exists, booking API accepts valid payload", async ({
    request,
  }) => {
    const listRes = await request.get("/api/mentors");
    const listBody = await listRes.json();
    const mentor = listBody.mentors?.[0];
    if (!mentor?.slug) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const startAt = new Date(`${dateStr}T10:00:00+05:30`).toISOString();
    const endAt = new Date(`${dateStr}T11:00:00+05:30`).toISOString();

    const response = await request.post(`/api/mentors/${mentor.slug}/book`, {
      data: {
        requesterName: "E2E Test User",
        requesterEmail: "e2e-booking@test.intelliforge.local",
        title: "Career guidance session",
        startAt,
        endAt,
        timezone: "Asia/Kolkata",
      },
    });

    expect([201, 200, 429]).toContain(response.status());
  });
});

test.describe("Mentors API (public)", () => {
  test("GET /api/mentors returns mentors array", async ({ request }) => {
    const response = await request.get("/api/mentors");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("mentors");
    expect(Array.isArray(body.mentors)).toBe(true);
    expect(body).toHaveProperty("total");
  });

  test("GET /api/mentors/nonexistent returns 404", async ({ request }) => {
    const response = await request.get("/api/mentors/nonexistent-mentor-slug-12345");
    expect(response.status()).toBe(404);
  });

  test("POST /api/mentors/nonexistent/book returns 404", async ({ request }) => {
    const response = await request.post("/api/mentors/nonexistent-mentor-slug-12345/book", {
      data: {
        requesterName: "Test",
        requesterEmail: "test@example.com",
        title: "Session",
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/mentors/slug/book rejects invalid email", async ({ request }) => {
    const listRes = await request.get("/api/mentors");
    const listBody = await listRes.json();
    const mentor = listBody.mentors?.[0];
    if (!mentor?.slug) return;

    const response = await request.post(`/api/mentors/${mentor.slug}/book`, {
      data: {
        requesterName: "Test",
        requesterEmail: "not-an-email",
        title: "Session",
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });
    expect(response.status()).toBe(400);
  });

  test("GET /api/mentors/me requires authentication", async ({ request }) => {
    const response = await request.get("/api/mentors/me");
    expect(response.status()).toBe(401);
  });

  test("GET /api/mentors/bookings requires authentication", async ({ request }) => {
    const response = await request.get("/api/mentors/bookings");
    expect(response.status()).toBe(401);
  });

  test("POST /api/mentors/slug/rate requires intern authentication", async ({
    request,
  }) => {
    const listRes = await request.get("/api/mentors");
    const listBody = await listRes.json();
    const mentor = listBody.mentors?.[0];
    if (!mentor?.slug) return;

    const response = await request.post(`/api/mentors/${mentor.slug}/rate`, {
      data: { rating: 5, comment: "Great mentor" },
    });
    expect(response.status()).toBe(401);
  });
});
