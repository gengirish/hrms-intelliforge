import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PLANS, formatSeatLimit } from "../../src/lib/plans";

/**
 * Regression suite for the 09/11/2026 QA pass (D1–D13 + observations).
 * Read-only against the app except test 2, which signs in a seeded intern.
 *
 * Mentor checks (7, 8) need mentor profiles; on an empty database they are
 * skipped. Locally, load the QA data first:
 *   node --env-file=.env.local scripts/qa-fix/seed-qa-fixtures.mjs --execute
 */

const PUBLIC_ROUTES = ["/", "/pricing", "/about", "/internships", "/mentors", "/sign-in", "/create-org"];

function titleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
}

function normaliseName(name: string): string {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

test.describe("QA regression 09/11/2026", () => {
  // 1 ────────────────────────────────────────────────────────────────────────
  test.describe("auth guard", () => {
    for (const path of ["/attendance", "/tasks", "/daily-plan", "/offer", "/intern-onboarding"]) {
      test(`${path} redirects anonymous users to sign-in`, async ({ request }) => {
        const res = await request.get(path, { maxRedirects: 0 });
        expect([302, 303, 307, 308]).toContain(res.status());
        const location = new URL(res.headers()["location"] ?? "", "http://x");
        expect(location.pathname).toBe("/sign-in");
        expect(location.searchParams.get("redirect")).toBe(path);
      });
    }
  });

  // 2 ────────────────────────────────────────────────────────────────────────
  test.describe("open redirect", () => {
    const email = process.env.E2E_INTERN_EMAIL ?? "priya.sharma@example.com"; // prisma/seed.mjs
    const password = process.env.E2E_INTERN_PASSWORD ?? "Test1234!";

    for (const target of ["https://example.com", "//example.com", "javascript:alert(1)"]) {
      test(`sign-in never leaves the origin for redirect=${target}`, async ({ page, baseURL }) => {
        await page.goto(`/sign-in?redirect=${encodeURIComponent(target)}`);
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Sign In", exact: true }).click();

        // Skip only when this environment has no such intern; any other outcome
        // (including a slow sign-in) must end on our origin or fail.
        const outcome = await Promise.race([
          page
            .waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 45_000 })
            .then(() => "left" as const),
          page
            .getByText(/invalid email or password/i)
            .first()
            .waitFor({ timeout: 45_000 })
            .then(() => "rejected" as const),
        ]);
        test.skip(outcome === "rejected", `seeded intern ${email} does not exist on this environment`);

        expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
        expect(new URL(page.url()).pathname).not.toMatch(/^\/sign-in/);
      });
    }
  });

  // 3 ────────────────────────────────────────────────────────────────────────
  test("unknown route returns 404 with a link home", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-qa");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  // 4 ────────────────────────────────────────────────────────────────────────
  test.describe("pricing CTAs carry the plan", () => {
    for (const key of ["starter", "growth"] as const) {
      test(`${key} CTA preselects ${key} on create-org`, async ({ page }) => {
        await page.goto("/pricing");
        await page.getByTestId(`plan-cta-${key}`).click();
        await expect(page).toHaveURL(new RegExp(`/create-org\\?plan=${key}$`), { timeout: 30_000 });
        await expect(page.getByTestId("selected-plan")).toContainText(PLANS[key].name);
        await expect(page.locator(`input[name="plan"][value="${key}"]`)).toBeChecked();
      });
    }

    test("invalid ?plan= falls back to Free", async ({ page }) => {
      await page.goto("/create-org?plan=__proto__");
      await expect(page.locator('input[name="plan"][value="free"]')).toBeChecked();
    });
  });

  // 5 ────────────────────────────────────────────────────────────────────────
  test.describe("plan limits match PLANS", () => {
    for (const path of ["/", "/pricing"]) {
      test(`cards on ${path}`, async ({ page }) => {
        await page.goto(path);
        for (const key of Object.keys(PLANS) as (keyof typeof PLANS)[]) {
          const limits = page.locator(`[data-plan="${key}"] [data-testid="plan-limits"]`);
          await expect(limits).toContainText(`${formatSeatLimit(PLANS[key].interns)}`);
          await expect(limits).toContainText(`${formatSeatLimit(PLANS[key].mentors)} mentors`);
        }
      });
    }

    test("pricing FAQ mentor seats", async ({ page }) => {
      await page.goto("/pricing");
      const answer = page.locator("dt", { hasText: "Are mentor seats included?" }).locator("xpath=following-sibling::dd");
      for (const key of ["free", "starter", "growth"] as const) {
        await expect(answer).toContainText(`${formatSeatLimit(PLANS[key].mentors)} on ${PLANS[key].name}`);
      }
    });

    test("meta description uses Free limits", async ({ request }) => {
      const html = await (await request.get("/pricing")).text();
      expect(html).toContain(`${PLANS.free.interns} interns and ${PLANS.free.mentors} mentors`);
    });
  });

  // 6 ────────────────────────────────────────────────────────────────────────
  test.describe("metadata", () => {
    test("each public route has a unique <title>", async ({ request }) => {
      const titles = new Map<string, string>();
      for (const path of PUBLIC_ROUTES) {
        const title = titleOf(await (await request.get(path)).text());
        expect(title, `${path} has a title`).not.toBe("");
        titles.set(path, title);
      }
      expect(new Set(titles.values()).size, JSON.stringify(Object.fromEntries(titles))).toBe(titles.size);
    });

    test("listing detail ships its title and description in raw HTML", async ({ request }) => {
      const list = await (await request.get("/internships")).text();
      const slug = list.match(/href="\/internships\/([a-z0-9-]+)"/)?.[1];
      test.skip(!slug, "no active listings");

      const { job } = await (await request.get(`/api/internships/${slug}`)).json();
      const res = await request.get(`/internships/${slug}`);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(titleOf(html)).toContain(job.title);
      expect(html).toContain(job.description.slice(0, 60));
      expect(html).toContain(`property="og:title"`);
    });

    test("unknown listing slug is a real 404", async ({ request }) => {
      expect((await request.get("/internships/no-such-listing-qa")).status()).toBe(404);
    });
  });

  // 7 ────────────────────────────────────────────────────────────────────────
  test("mentor directory: unique names, headlines, ₹ rates", async ({ page }) => {
    await page.goto("/mentors");
    const cards = page.getByTestId("mentor-card");
    const count = await cards.count();
    test.skip(count === 0, "no public mentors (run scripts/qa-fix/seed-qa-fixtures.mjs locally)");

    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      names.push(normaliseName(await card.locator("h2").innerText()));
      await expect(card.getByTestId("mentor-headline")).not.toBeEmpty();
    }
    expect(new Set(names).size, names.join(" | ")).toBe(names.length);

    for (const rate of await page.getByTestId("mentor-rate").allInnerTexts()) {
      expect(rate).toMatch(/^₹[\d,]+(\.\d{2})?\/hr$/);
    }
  });

  // 8 ────────────────────────────────────────────────────────────────────────
  test("expertise filter has no delimiter-joined tags", async ({ page }) => {
    await page.goto("/mentors");
    const select = page.getByTestId("expertise-filter");
    test.skip((await select.count()) === 0, "no expertise options");
    const options = await select.locator("option").allInnerTexts();
    for (const o of options) expect(o).not.toMatch(/[;,]/);
    expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(options.length);
  });

  // 9 ────────────────────────────────────────────────────────────────────────
  test.describe("a11y smoke", () => {
    for (const path of ["/", "/pricing", "/internships", "/mentors"]) {
      test(`${path} has no serious or critical axe violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
        expect(blocking, blocking.join("\n")).toEqual([]);
      });
    }
  });

  // 10 ───────────────────────────────────────────────────────────────────────
  test.describe("mobile 390px", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    for (const path of ["/", "/pricing"]) {
      test(`${path} has no horizontal scroll`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });

  // Extra: hero claims (D3) and copy (D7, D12).
  test("hero: only Free features next to Start free, readable headline", async ({ page }) => {
    await page.goto("/");
    const freeLabels = PLANS.free.features.map((f) => f.label);
    for (const item of await page.getByTestId("hero-free-highlights").locator("li").allInnerTexts()) {
      expect(freeLabels).toContain(item.trim());
    }
    const h1 = await page.locator("#hero-heading").textContent();
    expect(h1?.replace(/\s+/g, " ")).toContain("The Mentor Internship Platform: run cohorts");
    await expect(page.getByText("Interns onboarded")).toBeVisible();
  });
});
