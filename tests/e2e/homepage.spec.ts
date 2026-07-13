import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should render hero section with marketplace positioning", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Mentor Internship Platform");
    await expect(page.locator("h1")).toContainText("get paid");
  });

  test("should display marketplace feature section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mentor discovery", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internship listings", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ratings & accountability", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stipend payouts", exact: true })).toBeVisible();
  });

  test("should have working navigation links in navbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const topNav = page.locator("nav[aria-label='Primary']");
    await expect(topNav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "Internships", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "Mentors", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(topNav.getByRole("link", { name: "About", exact: true })).toBeVisible();
  });

  test("should have Start free CTA linking to create-org", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Start free — 5 interns" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/create-org");
  });

  test("should have demo video section or product tour CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "See it in 60 seconds" })).toBeVisible();

    const demoSection = page.locator('[aria-labelledby="demo-heading"]');
    const demoIframe = page.locator('iframe[title="IntelliForge HRMS product demo"]');
    const productTourLink = page.getByRole("link", {
      name: /watch product tour|book a walkthrough|product tour|schedule a demo/i,
    });
    const productTourText = page.getByText("Watch product tour");

    await expect(
      demoSection.or(demoIframe).or(productTourLink).or(productTourText).first(),
    ).toBeVisible();
  });

  test("should have pricing section on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(
      page.getByText("Start free. Scale mentors and interns together."),
    ).toBeVisible();
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

  test("should display social proof section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Built in production for our own cohort" }),
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
  test("loads and shows plan cards with mentor seats", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { name: /Pricing that scales with your marketplace/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
    await expect(page.getByText("Are mentor seats included?")).toBeVisible();
  });
});
