# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                    # dev server on :3000
npm run build                  # prisma migrate deploy + prisma generate + next build
npm run lint                   # next lint
npx tsc --noEmit                # typecheck (run separately; not a package.json script)

npm test                       # vitest run (tests/unit/**/*.test.ts)
npm run test:watch             # vitest watch
npx vitest run tests/unit/auth.test.ts        # single unit test file
npx vitest run -t "test name"                 # single test by name

npm run test:e2e               # playwright, starts Next on :3001 automatically
npx playwright test tests/e2e/auth.spec.ts    # single e2e spec
npm run test:e2e:ui            # playwright UI mode
# Or against an already-running/deployed server:
E2E_BASE_URL=http://localhost:3001 npm run test:e2e

npm run db:generate            # prisma generate (via scripts/run-with-local-env.mjs, reads .env.local)
npm run db:migrate:dev         # prisma migrate dev
npm run db:migrate             # prisma migrate deploy
npm run db:studio              # prisma studio
```

CI (`.github/workflows/ci.yml`) runs, in order: lint → typecheck → unit tests → build → e2e. Match that sequence locally before pushing.

`scripts/*.mjs` maintenance scripts (`purge-e2e-records.mjs`, `consolidate-single-org.mjs`, `delete-intern.mjs`, `diagnose-hr-interns.mjs`, `create-admin.mjs`) are dry-run by default and require `--execute` to write; run with `node --env-file=.env.local scripts/<name>.mjs`.

## Architecture

Single **Next.js 14 App Router monolith** — no separate backend service. All API logic lives in Route Handlers under `src/app/api/`; business logic/clients live in `src/lib/`. Deployed on Vercel at **https://hrms.intelliforge.tech**; DB is Neon Postgres via Prisma.

### Auth & session

- JWT (`jose`) in an HTTP-only cookie (`hrms-session`), issued/verified in `src/lib/auth.ts`.
- `src/middleware.ts` is the single choke point: it verifies the JWT and injects `x-user-id` / `x-user-role` / `x-user-email` / `x-user-org-id` / `x-user-admin-org-role` request headers for every non-public route.
- `getSession()` (`src/lib/auth.ts`) reads those headers first and only falls back to verifying the cookie directly — that fallback path is what cron and webhook handlers use, since their routes are listed as public in middleware and never get the injected headers.
- Cron routes (`src/app/api/cron/*`) and cron-only auth: check `Authorization: Bearer ${CRON_SECRET}` manually inside the route — middleware does not protect `/api/cron/*`.
- Webhook routes (`src/app/api/webhooks/*`) similarly verify their own provider-specific signature (see `interview-webhook-auth.ts`, AgentMail/WhatsApp/Stripe/Digio/RazorpayX each have their own check) rather than relying on middleware.

### Admin roles: ADMIN vs MENTOR

`Admin.role` is either `ADMIN` (full) or `MENTOR` (limited); the JWT carries it as the `adminOrgRole` claim. The split is enforced centrally in `src/middleware.ts` via the rules in `src/lib/mentor-access.ts`: MENTOR admins get redirected away from `/dashboard/settings`, `/dashboard/hiring`, `/dashboard/mentor-applications`, `/dashboard/payouts` and `/dashboard/marketplace`, and get 403s on `/api/billing/*`, `/api/jobs/*`, `/api/payouts/*`, `/api/dashboard/intern/[id]/payout-profile`, `PUT /api/org`, and org-admin-mutation endpoints (invite/promote/patch team members). When adding a new admin-only mutation, add its guard in `mentor-access.ts`, not just in the route handler. Middleware reads the JWT's `adminOrgRole` claim, which stays stale for the 7-day token lifetime after a demotion, so handlers that move money or change org config also re-check the role from the DB with `hasFullOrgAdminAccess()` / `isFullOrgAdmin()` (`src/lib/admin-intern-access.ts`).

### Multi-tenant isolation

`Admin`, `Intern`, `AdminInvite`, `JobPosting`, `MentorApplication` and `MarketplaceTransaction` have a `NOT NULL orgId` FK to `Organization` (`ON DELETE CASCADE`). `OfferEsignRequest`, `StipendPayoutBatch`, `ScheduledEvent`, `MentorProfile` and `MentorBooking` carry `orgId` without an FK. Everything else is scoped through a parent — intern data (`Attendance`, `Task`, `NotificationLog`, …) through `Intern`, `Candidate` through `JobPosting` — so a handler must check the parent's `orgId` (e.g. `getInternForAdmin()`) before acting, and return 404 for another org's record. `orgId` is assigned at write time from `session.orgId` (never trust a client-supplied org id); the `hrms-database` skill has the full table. Public signup-style endpoints that take no session — `POST /api/auth/register` and `POST /api/mentors/apply` — resolve their org through the shared `resolveOrgForPublicSignup()` (`src/lib/default-org.ts`): explicit `orgSlug` → `DEFAULT_ORG_SLUG` env → the sole org → 400. `DEFAULT_ORG_SLUG` must be set in Vercel whenever more than one `Organization` row exists, otherwise the public `/mentors/apply` and bare `/sign-up` pages (which send no slug) are refused. See `docs/MULTI_TENANT.md`.

### Notifications

Intern lifecycle notifications (onboarding, offer, reminders, nudges, completion, course enrolled) go through the single orchestrator `notify(internId, type, data)` in `src/lib/notifications.ts`, which fans out to Email (AgentMail, `src/lib/agentmail.ts`) and WhatsApp (`src/lib/whatsapp.ts`), respects per-intern opt-in, and logs to `NotificationLog`. Never call those intern email helpers or the WhatsApp client directly from a route or cron job.

Transactional mail to people who are not being notified as interns calls the helpers directly: candidates (`POST /api/careers/[slug]/apply` → `sendNewApplicationAlert()`, `sendApplicationReceivedEmail()`), mentor applications, weekly-progress mail between mentor and intern, and auth emails (`src/lib/auth-email.ts`). Await these sends — a fire-and-forget send can be frozen once a Vercel function returns. HR alerts go to `HR_ALERT_EMAILS` (comma-separated, defaults to `gen.girish@gmail.com`), **not** `hr@intelliforge.tech`: the domain's MX points at AgentMail, so mail from the HR inbox to itself is recorded as "sent" and never reaches a person. (`sendNewMentorApplicationAlert()` still has both problems.)

Offer acceptance is multi-channel — email reply "I Accept" (AgentMail webhook), WhatsApp "ACCEPT"/"Yes"/"Agree"/"Confirm" (WhatsApp webhook), the intern portal, admin `approve_offer`, and Digio e-sign — and every path goes through `acceptOffer()` in `src/lib/offer-acceptance.ts`. Change acceptance rules (status checks, negation handling like "I don't accept", learning provisioning, the `OFFER_ACCEPTED` notification) there, never in an individual route.

### Webhook idempotency

Provider webhooks (Stripe, RazorpayX, Digio, WhatsApp, AgentMail) call `claimWebhookEvent(provider, eventId)` (`src/lib/webhook-idempotency.ts`) after the signature check and before any side effect; it inserts into `webhook_events`, unique on `(provider, eventId)`. A `false` result is a retry — answer 200 and do nothing. If processing throws, `releaseWebhookEvent()` and return 5xx so the provider's retry is actually processed.

### WhatsApp transport: hub or direct Meta

`src/lib/whatsapp.ts` keeps one public API (`sendWhatsAppTemplate` / `sendWhatsAppText`) over **two transports**, chosen at call time by `isWhatsAppHubConfigured()`:

- **Central hub** (preferred) — `src/lib/whatsapp-hub.ts` posts to the shared Fly service as tenant `hrms` with `Authorization: Bearer` + `X-Tenant-Id`. The hub owns the WABA/token/app-secret. Requires an `hrms:if_live_…` pair in the hub's `WHATSAPP_API_KEYS`, plus this entry in its `WHATSAPP_TENANT_WEBHOOKS` so inbound replies come back:
  ```
  hrms:https://hrms.intelliforge.tech/api/webhooks/whatsapp
  ```
  Note the hub **requires opt-in before it will send** to a contact (`hubOptIn()`).
- **Direct Meta Graph** (fallback) — used only when `WHATSAPP_HUB_API_KEY` is unset, so setting/unsetting that one variable is the cutover and the rollback.

`/api/webhooks/whatsapp` accepts both transports and shares one handler. The hub identifies itself with `X-WhatsApp-Hub-Tenant` and forwards a **normalised** payload (`{ type, message?, status? }` where message is `{ fromE164, text, waMessageId, … }`); Meta sends its own signed `entry[].changes[].value` shape. Tenant mismatch is 403; a malformed hub forward returns 200 so the hub does not retry forever.

### WhatsApp OTP login

`/api/auth/otp/request` and `/api/auth/otp/verify` (`src/lib/otp.ts`, rate-limited per IP at 10/min and 20/min) let an intern sign in with a WhatsApp code instead of a password. Verification issues the same `hrms-session` cookie via `signJWT` + `setAuthCookie`, so nothing downstream knows the difference. Unlike other IntelliForge products this does **not** delegate identity to Clerk — HRMS mints its own session, so a verified number is mapped onto an existing `Intern` row and **never creates an account**. `Intern.phone` is not unique, so matches are narrowed by `resolveInternByPhone()` (`src/lib/otp.ts`) before ambiguity is judged: deactivated interns are never a sign-in target, a single ACTIVE match wins over any PENDING/OFFERED/COMPLETED rows sharing the number, and only a genuine tie (two ACTIVE, or two non-ACTIVE with no ACTIVE to prefer) is refused with 409. Both `/request` and `/verify` use the same resolution so they cannot disagree about who owns a number. `/request` only sends to a number that already belongs to an intern but responds identically either way, so it cannot be used to enumerate intern phone numbers.

### Intern lifecycle

```
PENDING --send_offer--> OFFERED --approve_offer / accept--> ACTIVE --mark_complete--> COMPLETED
                                                                 |
                                                        deactivate / reactivate
```
Driven via `POST /api/dashboard/action` (`update_stipend`, `send_offer`, `approve_offer`, `send_reminder`, `mark_complete`, `deactivate`, `reactivate`). `send_offer` requires stipend > 0. Deactivated interns are excluded from cron jobs and hidden from the dashboard by default (soft delete, not hard delete).

### Hiring pipeline

`/internships/[slug]` (public apply; `/careers/[slug]` redirects there) → optional external Interview Bot interview (score/report synced via `/api/webhooks/interview-bot`) → admin review/schedule → `POST /api/jobs/[id]/convert` creates the `Intern` record and folds the candidate into the intern lifecycle above.

`JobPosting.formType` selects the application form. `STANDARD` is the flow above. `EXPERT_NETWORK` (`src/lib/hiring/expert-network.ts`) is for partner programmes that are not internships — e.g. the Cognyzer researcher network: it collects expertise, highest qualification, H-index and an optional Scholar/ORCID link, requires a resume, supports submitting someone else's resume as a referral (referrer name/email + explicit consent), skips Interview Bot creation, and in the dashboard shows the referral payout (`referralPayoutPaise()`: H-index 0–1 → ₹300, >1 → ₹500) instead of an interview score, with Schedule and Convert hidden. The dashboard has no edit-posting UI yet, so `formType` is chosen at creation.

### Cron jobs

Defined in `vercel.json`, all IST-scheduled: `task-reminder` (Mon 9am), `attendance-nudge` (weekdays 10:30am), `daily-plan-nudge` (weekdays 11am), `performance-scores` (daily midnight).

## Skills directories

`.claude/skills/` (Claude Code), `.cursor/skills/` (Cursor) and `.agents/skills/` (Antigravity) hold the same five skills and must stay identical — edit all three together. The only intended difference is the script path inside `ui-ux-pro-max/SKILL.md`, which points at its own folder.

| Skill | Covers |
|---|---|
| `hrms-project` | Architecture map: structure, features, models, auth/roles, env, key rules |
| `hrms-database` | Prisma schema changes, migrations, tenant scoping, production data fixes |
| `hrms-agentmail` | Email helpers, `notify()` vs direct sends, HR alerts, AgentMail webhook, delivery debugging |
| `hrms-linkedin-mentor` | `/api/mentors/import-linkedin` LinkedIn → mentor profile flow |
| `ui-ux-pro-max` | Stack-agnostic UI/UX design reference |

Skills written for the separate Interview Bot project (FastAPI, SQLAlchemy, LiveKit, Zustand, TanStack Query) were removed; don't reintroduce them here.

Only **`hrms-project`** (accurate architecture/schema/conventions overview for this repo), **`hrms-linkedin-mentor`** (accurate: `/api/mentors/import-linkedin` mentor-from-LinkedIn flow), **`hrms-database`** (Prisma/Postgres patterns, generically correct), and **`hrms-agentmail`** (the IntelliForge HRMS half of it) reliably describe this codebase. `ui-ux-pro-max` is a generic, stack-agnostic design reference tool and is accurate regardless of project.

## Conventions

- Dates: DD/MM/YYYY display, ISO in DB; timezone Asia/Kolkata (IST).
- Money: stipends stored in paise (`Int`), displayed as `₹` with `en-IN` locale.
- Phone numbers: normalized to E.164 (`+91XXXXXXXXXX`) for WhatsApp.
- Migrations: use `prisma migrate deploy` in production, never `db push` — schema changes must be versioned SQL files in `prisma/migrations/`.
- Rate limiting: use `rateLimit()` from `src/lib/rate-limit.ts` on auth and other sensitive endpoints.
- After running Playwright locally against a shared DB, purge test rows: `node --env-file=.env.local scripts/purge-e2e-records.mjs --execute`.
