# QA fix — repo map (09/11/2026)

Written before any defect fix, as the starting map for D1–D13.

## Stack

| Area | What is there |
|---|---|
| Framework | Next.js **14.2** App Router monolith, one Vercel project (`hrms.intelliforge.tech`). No separate backend; API = Route Handlers under `src/app/api/`. |
| Data | Prisma 5 → Neon Postgres. Schema `prisma/schema.prisma`, versioned SQL in `prisma/migrations/`. |
| Auth | **Custom**, not Clerk. JWT (`jose`) in the `hrms-session` cookie, `src/lib/auth.ts`; `src/middleware.ts` verifies it and redirects anonymous users on `/dashboard` + intern portal routes to `/sign-in?redirect=<path>`. (Clerk keys exist in a local env file but no code uses them.) |
| Billing | **Stripe** subscriptions: `src/lib/stripe.ts`, `POST /api/billing/checkout` (needs an admin session, reads `STRIPE_<PLAN>_PRICE_ID`), `POST /api/billing/portal`, webhook `src/app/api/webhooks/stripe/route.ts` sets `Organization.plan`/limits on `checkout.session.completed`. Returns 503 when `STRIPE_SECRET_KEY` or the price id is unset. Razorpay (`src/lib/razorpay.ts`) is used for stipend payouts, not plan billing. |
| Validation | Zod everywhere (`src/lib/validations.ts`, inline schemas in routes). Routes return `NextResponse.json({ ... })` / `{ error }` — there is **no shared `ApiResponse<T>` envelope** in this repo, so new code follows the existing shape. |
| Tests | Vitest unit (`tests/unit/**/*.test.ts`), Playwright e2e (`tests/e2e/*.spec.ts`, dev server on :3001). CI: lint → tsc → unit → build → e2e on a throwaway Postgres built with `prisma db push` + `prisma/seed.mjs`. |
| Package manager | **npm** (`package-lock.json`), not pnpm. |

## Marketing / public pages

| Route | File | Rendering today |
|---|---|---|
| `/` | `src/app/page.tsx` | Server component. Hero, stats, `DemoVideo`, features, `SocialProof`, `PricingSection`, intern-portal card, final CTA. |
| `/pricing` | `src/app/pricing/page.tsx` | Server. Hero copy, `PricingSection`, FAQ array (hardcoded limits). Has `metadata`. |
| `/about` | `src/app/about/page.tsx` | Server. Founder section with local `FOUNDER_URL` / `FOUNDER_EMAIL` (Gmail). Has `metadata`. |
| `/internships` | `src/app/internships/page.tsx` + `search.tsx` | Server list (Prisma), client search. **No `metadata`** → inherits the homepage title. |
| `/internships/[slug]` | `src/app/internships/[slug]/page.tsx` | **Entirely `"use client"`** (851 lines): fetches `/api/internships/[slug]` in `useEffect`; raw HTML is nav + spinner + footer. |
| `/careers/[slug]` | redirects to `/internships/[slug]` | |
| `/mentors` | `src/app/mentors/page.tsx` + `components/mentors/mentor-directory.tsx` | Server list (Prisma), client filter/pagination. **No `metadata`**. Copy written for signed-in org members. |
| `/mentors/[slug]` | `src/app/mentors/[slug]/page.tsx` | **Entirely `"use client"`**, fetches `/api/mentors/[slug]`. |
| `/create-org` | `src/app/create-org/page.tsx` | Client form → `POST /api/org`. No plan field. **No `metadata`** (client page, no layout). |
| `/sign-in` | `src/app/sign-in/page.tsx` | Client. `redirect` query param passed straight to `router.push()` (also in `components/auth/whatsapp-otp-form.tsx`). **No `metadata`**. |
| 404 | `src/app/not-found.tsx` | Says "IntelliForge HRMS". |

`src/app/loading.tsx` sits at the **root**, so every page — including server-rendered marketing pages — streams a "Loading..." spinner as its first HTML chunk. That is the "list pages show Loading…" symptom.

There is **no `sitemap.ts` / `robots.ts`**.

## Plan / pricing data (duplicated today)

- `src/lib/plans.ts` — `PLANS` limits + Stripe price ids (500/20 on free, starter, growth; 999999 on enterprise).
- `src/lib/pricing.ts` — `MARKETING_PLANS` (USD price strings, feature bullets incl. a hardcoded "20 mentors"), `DASHBOARD_PLANS`, `FREE_PLAN_MAX_INTERNS`.
- `src/lib/plan-limits.ts` — a **second** mentor-limit table `PLAN_MENTOR_LIMITS`, `getPlanLimits()`, `assertCanAddIntern/Mentor()` (server enforcement reads the org row's `maxInterns`/`maxMentors`).
- `src/lib/stripe.ts` — a **third** `getPlanLimits()` used by the Stripe webhook.
- Hardcoded copy: `layout.tsx` meta description, `pricing/page.tsx` meta + FAQ, `page.tsx` final CTA ("20 mentors"), `create-org/page.tsx`.
- `Organization` row: `plan String @default("free")`, `maxInterns Int @default(500)`, `maxMentors Int @default(20)`, `platformFeeBps Int @default(1000)`. No `requestedPlan`.

## Mentors

- `MentorProfile` (`orgId` without FK, `slug` unique, `headline?`, `bio?`, `expertise String[]`, `yearsExperience?`, `hourlyRatePaise Int?`, `isPublic`). Name comes from `Admin.name`.
- Writers of `headline`/`bio`/`expertise`: `api/mentors/me` (self), `api/org/admins/[id]/profile` (org admin), `api/mentors/import-linkedin`, `api/mentors/apply` → `MentorApplication`, `api/mentor-applications/[id]` (approval copies to profile).
- Public reads: `/mentors` page query, `api/mentors` (list), `api/mentors/[slug]`.
- Rate formatting: `mentor-card.tsx` renders `₹5.0k/hr` then strips the `₹` and shows a rupee *icon* (which has no text) → plain text "5.0k/hr".
- Owner edit UI: `src/app/dashboard/mentor-profile/page.tsx`.

## Listings

- `JobPosting` (`slug` unique, `employmentType` string, `salaryInfo String?` free text, `formType`). Slug generated once at create (`generateSlug` in `src/lib/utils.ts`) in `POST /api/jobs`. There is **no edit endpoint or UI** for postings.

## Brand / contact

- `src/lib/company.ts` — legal/office details, `email: hr@intelliforge.tech`.
- Founder URL `girishbhiremath.vercel.app` is hardcoded in `layout.tsx` (metadata + JSON-LD), `footer.tsx` (x2), `sign-in/page.tsx`, `command-palette.tsx`, `about/page.tsx`.
- "IntelliForge HRMS" appears in page titles (portal layouts), sign-in, sign-up, reset-password, accept-invite, not-found, demo video, auth/intern emails.
- Logo: `components/brand-mark.tsx` ("Mi" mark already `aria-hidden`; link `aria-label` is "Mentor Internship Platform — Home").

## Local verification setup used for this fix

- Isolated git worktree at `../hrms-wt/qa-fix` on `fix/qa-2026-11-09` (other sessions switch branches in the main checkout).
- Throwaway Docker Postgres (`qa-fix-pg`, port 55490) built exactly like CI (`prisma db push` + `prisma/seed.mjs`). No Neon branch, production or test, is touched.
