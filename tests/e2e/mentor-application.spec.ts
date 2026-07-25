import { test, expect } from "@playwright/test";
import { expectSignInRedirect } from "./helpers/auth";

test.describe("Mentor application form (public)", () => {
  test("/mentors/apply loads with 200 and is not gated", async ({ page }) => {
    const response = await page.goto("/mentors/apply");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test("renders the apply hero and heading", async ({ page }) => {
    await page.goto("/mentors/apply");
    await expect(page.getByText("Apply as a mentor")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#main-content h1")).toContainText("Mentor with");
  });

  test("shows the core application fields", async ({ page }) => {
    await page.goto("/mentors/apply");
    await expect(page.getByLabel(/Full name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Headline/i)).toBeVisible();
    await expect(page.getByLabel(/Areas of expertise/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit application/i })).toBeVisible();
  });

  test("does not submit when required fields are empty", async ({ page }) => {
    // Safety net: never let an incomplete submit reach the (production) DB.
    await page.route("**/api/mentors/apply", (route) => route.abort());

    await page.goto("/mentors/apply");
    await page.getByRole("button", { name: /Submit application/i }).click();

    // Native `required` (or the JS guard) blocks it — success state must not appear.
    await expect(
      page.getByRole("heading", { name: /Application received/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Submit application/i })).toBeVisible();
  });

  test("shows the success state after a valid submit (API mocked)", async ({ page }) => {
    // Mock the endpoint so the test never writes to the real database.
    await page.route("**/api/mentors/apply", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, applicationId: "e2e-test" }),
      }),
    );

    await page.goto("/mentors/apply");
    await page.getByLabel(/Full name/i).fill("E2E Test Mentor");
    await page.getByLabel(/Email/i).fill("e2e-mentor@test.intelliforge.local");
    await page.getByRole("button", { name: /Submit application/i }).click();

    await expect(
      page.getByRole("heading", { name: /Application received/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Browse current mentors/i })).toBeVisible();
  });
});

test.describe("Mentor directory → apply CTA", () => {
  test("directory hero links to /mentors/apply", async ({ page }) => {
    await page.goto("/mentors");
    const cta = page.getByRole("link", { name: /Apply to become a mentor/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toHaveAttribute("href", "/mentors/apply");
  });
});

test.describe("Mentor application API", () => {
  test("POST /api/mentors/apply rejects an invalid email (400)", async ({ request }) => {
    const response = await request.post("/api/mentors/apply", {
      data: { name: "Jane Doe", email: "not-an-email" },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/mentors/apply rejects a missing name (400)", async ({ request }) => {
    const response = await request.post("/api/mentors/apply", {
      data: { email: "jane@example.com" },
    });
    expect(response.status()).toBe(400);
  });

  test("GET /api/mentor-applications requires authentication (401)", async ({
    request,
  }) => {
    const response = await request.get("/api/mentor-applications");
    expect(response.status()).toBe(401);
  });

  test("PATCH /api/mentor-applications/:id requires authentication (401)", async ({
    request,
  }) => {
    const response = await request.patch("/api/mentor-applications/some-id-123", {
      data: { action: "approve" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Mentor applications dashboard (auth gate)", () => {
  test("unauthenticated visit redirects to /sign-in", async ({ page }) => {
    await page.goto("/dashboard/mentor-applications");
    await expectSignInRedirect(page, "/dashboard/mentor-applications");
  });
});
