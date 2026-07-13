import { test, expect } from "@playwright/test";

/**
 * Legacy /careers routes redirect to /internships.
 * UI and listing tests live in internships.spec.ts.
 */

test.describe("Careers API (backward compatible)", () => {
  test("GET /api/careers returns 200 with jobs array", async ({ request }) => {
    const response = await request.get("/api/careers");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("jobs");
    expect(Array.isArray(body.jobs)).toBe(true);
  });

  test("GET /api/careers/nonexistent returns 404", async ({ request }) => {
    const response = await request.get("/api/careers/nonexistent-id-12345");
    expect(response.status()).toBe(404);
  });

  test("POST /api/careers/nonexistent/apply returns 404", async ({ request }) => {
    const response = await request.post("/api/careers/nonexistent-id-12345/apply", {
      data: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/careers apply rejects missing required fields", async ({ request }) => {
    const careersRes = await request.get("/api/careers");
    const careersBody = await careersRes.json();
    if (careersBody.jobs?.length > 0) {
      const jobSlug = careersBody.jobs[0].slug;
      const response = await request.post(`/api/careers/${jobSlug}/apply`, {
        data: {},
      });
      expect([400, 404]).toContain(response.status());
    }
  });

  test("POST /api/careers apply rejects invalid email", async ({ request }) => {
    const careersRes = await request.get("/api/careers");
    const careersBody = await careersRes.json();
    if (careersBody.jobs?.length > 0) {
      const jobSlug = careersBody.jobs[0].slug;
      const response = await request.post(`/api/careers/${jobSlug}/apply`, {
        data: {
          name: "Test User",
          email: "not-an-email",
        },
      });
      expect(response.status()).toBe(400);
    }
  });
});

test.describe("Careers redirect", () => {
  test("/careers redirects to /internships", async ({ page }) => {
    await Promise.all([
      page.waitForURL(/\/internships\/?$/, { timeout: 20_000 }),
      page.goto("/careers"),
    ]);
  });
});
