import { test, expect, devices, type Page } from "@playwright/test";

// Chromium with the iPhone 13 profile: CI only installs Chromium, and the device
// descriptor's defaultBrowserType would otherwise ask for WebKit.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
  devices["iPhone 13"];
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

const MARKETING_PAGES = ["/", "/pricing", "/internships", "/about", "/mentors"];

const openDrawer = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(drawer).toBeVisible();
  return drawer;
};

const bottomNav = (page: Page) =>
  page.getByRole("navigation", { name: "Bottom navigation" });

test.describe("Mobile navigation drawer", () => {
  test("fills the viewport with every link visible without scrolling", async ({
    page,
  }) => {
    const drawer = await openDrawer(page);
    const box = await drawer.boundingBox();
    const height = page.viewportSize()!.height;
    expect(box!.height).toBeGreaterThanOrEqual(height * 0.9);

    const links = drawer.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const link = await links.nth(i).boundingBox();
      expect(link!.y).toBeGreaterThanOrEqual(0);
      expect(link!.y + link!.height).toBeLessThanOrEqual(height);
    }
  });

  test("tapping the backdrop closes it and restores body scroll", async ({
    page,
  }) => {
    const drawer = await openDrawer(page);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.touchscreen.tap(20, 300);
    await expect(drawer).toBeHidden();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("Escape closes it, restores body scroll and returns focus", async ({
    page,
  }) => {
    const drawer = await openDrawer(page);
    await expect(
      drawer.getByRole("button", { name: "Close menu" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await expect(
      page.getByRole("button", { name: "Open navigation menu" }),
    ).toBeFocused();
  });

  test("closes on route change", async ({ page }) => {
    const drawer = await openDrawer(page);
    await drawer.getByRole("link", { name: "Pricing", exact: true }).click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(drawer).toBeHidden();
  });
});

test.describe("Bottom navigation when logged out", () => {
  test("shows only marketing tabs, none of which bounce to /sign-in", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const links = bottomNav(page).getByRole("link");
    await expect(links).toHaveCount(4);
    const hrefs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")),
    );
    expect(hrefs).toEqual(["/", "/internships", "/pricing", "/sign-in"]);

    for (const href of hrefs.filter((h) => h !== "/sign-in")) {
      const response = await request.get(href!, { maxRedirects: 0 });
      expect(response.status(), href!).toBe(200);
    }
  });

  for (const path of MARKETING_PAGES) {
    test(`is shown on ${path} without covering the page end`, async ({
      page,
    }) => {
      await page.goto(path);
      const nav = bottomNav(page);
      await expect(nav).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(async () => {
        const footerBox = await page.getByRole("contentinfo").boundingBox();
        const navBox = await nav.boundingBox();
        expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(
          navBox!.y + 1,
        );
      }).toPass();
    });
  }

  test("highlights the active tab", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      bottomNav(page).getByRole("link", { name: "Pricing" }),
    ).toHaveAttribute("aria-current", "page");
  });

  for (const path of ["/sign-in", "/sign-up", "/reset-password"]) {
    test(`is hidden on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main, form").first()).toBeVisible();
      await expect(bottomNav(page)).toHaveCount(0);
    });
  }
});

test.describe("Mobile QA regressions", () => {
  test("sign-in inputs are empty on load", async ({ page }) => {
    await page.goto("/sign-in");
    const email = page.locator('input[type="email"]');
    const password = page.locator('input[type="password"]');
    await expect(email).toHaveValue("");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(password).toHaveValue("");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
  });

  test("/careers is a server-side redirect to /internships", async ({
    request,
  }) => {
    const response = await request.get("/careers", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/internships");
  });

  test("footer links are at least 44px tall", async ({ page }) => {
    await page.goto("/pricing");
    const links = page.getByRole("contentinfo").locator("ul a");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  for (const path of MARKETING_PAGES) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});
