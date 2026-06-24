import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should render hero section with SaaS positioning", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Run internship programs");
    await expect(page.locator("h1")).toContainText("spreadsheet chaos");
  });

  test("should display feature section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Self-serve onboarding")).toBeVisible();
    await expect(page.getByText("Attendance that sticks")).toBeVisible();
    await expect(page.getByText("Offer letters on autopilot")).toBeVisible();
  });

  test("should have working navigation links in navbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const topNav = page.locator("nav[aria-label='Primary']");
    await expect(topNav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "Careers", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "About", exact: true })).toBeVisible();
  });

  test("should have Start free CTA linking to create-org", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Start free — 5 interns" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/create-org");
  });

  test("should have demo video section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "See it in 60 seconds" })).toBeVisible();
    await expect(page.getByText("Watch 60-second demo")).toBeVisible();
  });

  test("should have pricing section on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.getByText("Start free. Scale when your cohort grows.")).toBeVisible();
  });

  test("should show Sign In and Start free when not authenticated", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
  });

  test("should have footer visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("should display social proof testimonials", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Trusted by teams running intern programs" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Onboarding dropped from 3 days of back-and-forth emails/),
    ).toBeVisible();
  });

  test("intern portal links are accessible from homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Start onboarding" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Intern sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});

test.describe("Pricing page", () => {
  test("loads and shows plan cards", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Pricing that scales/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
  });
});
