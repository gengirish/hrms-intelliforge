import { test, expect } from "@playwright/test";

test.describe("Careers Page", () => {
  test("/careers page loads with 200", async ({ page }) => {
    const response = await page.goto("/careers");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("renders hero section with hiring headline", async ({ page }) => {
    await page.goto("/careers");
    await expect(page.locator("h1")).toContainText("IntelliForge AI");
    await expect(page.getByText(/We're Hiring/i)).toBeVisible();
  });

  test("has search input for filtering roles", async ({ page }) => {
    await page.goto("/careers");
    await expect(
      page.getByPlaceholder(/Search by role or skill/i)
    ).toBeVisible();
  });

  test("displays job listing cards or empty state", async ({ page }) => {
    await page.goto("/careers");
    const hasJobs = await page.getByText(/open position/i).isVisible();
    const hasEmpty = await page
      .getByText(/No open positions|No positions match/i)
      .isVisible();
    expect(hasJobs || hasEmpty).toBe(true);
  });

  test("navbar has Careers link", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/careers");
    const topNav = page.locator("nav").first();
    await expect(topNav.getByText("Careers", { exact: true })).toBeVisible();
  });

  test("footer has Careers link", async ({ page }) => {
    await page.goto("/careers");
    await expect(
      page.locator("footer").getByRole("link", { name: "Careers" })
    ).toBeVisible();
  });
});

test.describe("Careers Detail Page", () => {
  test("/careers/nonexistent shows not-found state", async ({ page }) => {
    await page.goto("/careers/nonexistent-id-12345");
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(/Position Not Found|not found|doesn't exist/i).first()
    ).toBeVisible();
  });

  test("/careers/nonexistent has View All Positions link", async ({
    page,
  }) => {
    await page.goto("/careers/nonexistent-id-12345");
    await page.waitForTimeout(2000);
    await expect(
      page.getByRole("link", { name: /View All Positions/i })
    ).toBeVisible();
  });
});

test.describe("Careers API (public)", () => {
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

  test("POST /api/careers/nonexistent/apply returns 404", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/careers/nonexistent-id-12345/apply",
      {
        data: {
          name: "Test User",
          email: "test@example.com",
        },
      }
    );
    expect(response.status()).toBe(404);
  });

  test("POST /api/careers apply rejects missing required fields", async ({
    request,
  }) => {
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

  test("POST /api/careers apply rejects invalid email", async ({
    request,
  }) => {
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

test.describe("Careers Navigation Flow", () => {
  test("clicking Careers in navbar navigates to /careers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const topNav = page.locator("nav").first();
    await topNav.getByText("Careers", { exact: true }).click();
    await expect(page).toHaveURL(/\/careers/);
  });

  test("careers page is accessible without authentication", async ({
    page,
  }) => {
    const response = await page.goto("/careers");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });
});

test.describe("Careers Job Detail with Seeded Data", () => {
  test("if intern posting exists, detail page renders full JD", async ({
    page,
    request,
  }) => {
    const careersRes = await request.get("/api/careers");
    const careersBody = await careersRes.json();
    const internJob = careersBody.jobs?.find(
      (j: { title: string }) =>
        j.title.toLowerCase().includes("intern") ||
        j.title.toLowerCase().includes("ai native")
    );

    if (internJob) {
      await page.goto(`/careers/${internJob.slug}`);
      await page.waitForTimeout(2000);
      await expect(page.locator("h1")).toContainText(internJob.title);
      await expect(page.getByText(/Now Hiring/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Apply Now/i })
      ).toBeVisible();
    }
  });

  test("if intern posting exists, Apply Now reveals application form", async ({
    page,
    request,
  }) => {
    const careersRes = await request.get("/api/careers");
    const careersBody = await careersRes.json();
    const internJob = careersBody.jobs?.find(
      (j: { title: string }) =>
        j.title.toLowerCase().includes("intern") ||
        j.title.toLowerCase().includes("ai native")
    );

    if (internJob) {
      await page.goto(`/careers/${internJob.slug}`);
      await page.waitForTimeout(2000);
      await page.getByRole("button", { name: /Apply Now/i }).click();
      await expect(page.getByLabel(/Full Name/i)).toBeVisible();
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Submit Application/i })
      ).toBeVisible();
    }
  });

  test("if intern posting exists, API returns rich fields", async ({
    request,
  }) => {
    const careersRes = await request.get("/api/careers");
    const careersBody = await careersRes.json();

    if (careersBody.jobs?.length > 0) {
      const jobSlug = careersBody.jobs[0].slug;
      const detailRes = await request.get(`/api/careers/${jobSlug}`);
      expect(detailRes.status()).toBe(200);
      const detailBody = await detailRes.json();
      expect(detailBody.job).toHaveProperty("title");
      expect(detailBody.job).toHaveProperty("description");
      expect(detailBody.job).toHaveProperty("skills");
      expect(detailBody.job).toHaveProperty("employmentType");
    }
  });
});
