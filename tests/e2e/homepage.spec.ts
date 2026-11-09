import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should render hero section with internal program positioning", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Mentor Internship Platform");
    await expect(page.locator("h1")).toContainText("get paid");
  });

  test("should display program operations feature section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mentor roster", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cohort listings", exact: true })).toBeVisible();
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
    const cta = page.getByRole("link", { name: /^Start free — \d+ interns$/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/create-org");
  });

  test("demo section embeds a video or links honestly to the features", async ({ page }) => {
    await page.goto("/");
    const demoSection = page.locator('[aria-labelledby="demo-heading"]');
    await expect(demoSection).toBeVisible();

    const demoIframe = demoSection.locator('iframe[title="Mentor Internship Platform product demo"]');
    if ((await demoIframe.count()) > 0) {
      await expect(demoIframe).toBeVisible();
      return;
    }
    // No video configured: no "Watch product tour" promise (D8).
    await expect(page.getByText(/watch product tour/i)).toHaveCount(0);
    const howItWorks = demoSection.getByRole("link", { name: /see how it works/i });
    await expect(howItWorks).toHaveAttribute("href", "#features-heading");
  });

  test("should have pricing section on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pricing")).toBeVisible();
    // Heading copy depends on whether plans differ by capacity (Q1); see pricingCopy().
    await expect(page.locator("#pricing-heading")).toContainText(/^Start free\./);
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
      page.getByRole("heading", { name: /Pricing that scales with your program/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
    await expect(page.getByText("Are mentor seats included?")).toBeVisible();
  });
});
