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

Single **Next.js 14 App Router monolith** — no separate backend service. All API logic lives in Route Handlers under `src/app/api/`; business logic/clients live in `src/lib/`. Deployed on Vercel; DB is Neon Postgres via Prisma.

### Auth & session

- JWT (`jose`) in an HTTP-only cookie (`hrms-session`), issued/verified in `src/lib/auth.ts`.
- `src/middleware.ts` is the single choke point: it verifies the JWT and injects `x-user-id` / `x-user-role` / `x-user-email` / `x-user-org-id` / `x-user-admin-org-role` request headers for every non-public route.
- `getSession()` (`src/lib/auth.ts`) reads those headers first and only falls back to verifying the cookie directly — that fallback path is what cron and webhook handlers use, since their routes are listed as public in middleware and never get the injected headers.
- Cron routes (`src/app/api/cron/*`) and cron-only auth: check `Authorization: Bearer ${CRON_SECRET}` manually inside the route — middleware does not protect `/api/cron/*`.
- Webhook routes (`src/app/api/webhooks/*`) similarly verify their own provider-specific signature (see `interview-webhook-auth.ts`, AgentMail/WhatsApp/Stripe/Digio/RazorpayX each have their own check) rather than relying on middleware.

### Admin roles: ADMIN vs MENTOR

`Admin.orgAdminRole` is either `ADMIN` (full) or `MENTOR` (limited). The split is enforced centrally in `src/middleware.ts`, not per-route: MENTOR admins get redirected away from `/dashboard/settings` and `/dashboard/hiring`, and get 403s on `/api/billing/*`, `/api/jobs/*`, `PUT /api/org`, and org-admin-mutation endpoints (invite/promote/patch team members). When adding a new admin-only mutation, add its guard in middleware, not just in the route handler.

### Multi-tenant isolation

Every tenant-scoped table has a `NOT NULL orgId` FK to `Organization` (`ON DELETE CASCADE`), enforced at the Postgres level — orphan rows are structurally impossible. `orgId` is assigned at write time from `session.orgId` (never trust a client-supplied org id); see the table in `.cursor/skills/hrms-project/SKILL.md` / `.agents/skills/hrms-project/SKILL.md` for the exact code path per mutation. Registration (`POST /api/auth/register`) auto-attaches to the sole org when only one exists, otherwise requires `orgSlug`.

### Notifications

All outbound intern communication goes through the single orchestrator `notify(internId, type, data)` in `src/lib/notifications.ts`, which fans out to Email (AgentMail, `src/lib/agentmail.ts`) and WhatsApp (`src/lib/whatsapp.ts`), respects per-intern opt-in, and logs to `NotificationLog`. Never call AgentMail/WhatsApp clients directly from a route or cron job — always go through `notify()`.

Offer acceptance is dual-channel: interns can reply "I Accept" by email (AgentMail webhook) or "ACCEPT"/"Yes"/"Agree"/"Confirm" on WhatsApp (WhatsApp webhook) — both paths must stay in sync if the acceptance logic changes.

### Intern lifecycle

```
PENDING --send_offer--> OFFERED --approve_offer / accept--> ACTIVE --mark_complete--> COMPLETED
                                                                 |
                                                        deactivate / reactivate
```
Driven via `POST /api/dashboard/action` (`update_stipend`, `send_offer`, `approve_offer`, `send_reminder`, `mark_complete`, `deactivate`, `reactivate`). `send_offer` requires stipend > 0. Deactivated interns are excluded from cron jobs and hidden from the dashboard by default (soft delete, not hard delete).

### Hiring pipeline

`/careers/[slug]` (public apply) → optional external Interview Bot interview (score/report synced via `/api/webhooks/interview-bot`) → admin review/schedule → `POST /api/jobs/[id]/convert` creates the `Intern` record and folds the candidate into the intern lifecycle above.

### Cron jobs

Defined in `vercel.json`, all IST-scheduled: `task-reminder` (Mon 9am), `attendance-nudge` (weekdays 10:30am), `daily-plan-nudge` (weekdays 11am), `performance-scores` (daily midnight).

## Skills directories

`.cursor/skills/` and `.agents/skills/` (Cursor/Antigravity equivalents, kept in sync) contain domain skill files. **Most of them (`hrms-backend`, `hrms-ai-engine`, `hrms-billing`, `hrms-deploy`, `hrms-forms`, `hrms-frontend`, `hrms-realtime`, `hrms-tanstack-query`, `hrms-testing`, `hrms-zustand`) are generic templates written for a different project** — a separate FastAPI + Docker + LiveKit "Interview Bot" service with Zustand/TanStack Query, none of which exist in this repo. Treat their code samples as illustrative only, not as this codebase's actual patterns.

Only **`hrms-project`** (accurate architecture/schema/conventions overview for this repo), **`hrms-linkedin-mentor`** (accurate: `/api/mentors/import-linkedin` mentor-from-LinkedIn flow), **`hrms-database`** (Prisma/Postgres patterns, generically correct), and **`hrms-agentmail`** (the IntelliForge HRMS half of it) reliably describe this codebase. `ui-ux-pro-max` is a generic, stack-agnostic design reference tool and is accurate regardless of project.

## Conventions

- Dates: DD/MM/YYYY display, ISO in DB; timezone Asia/Kolkata (IST).
- Money: stipends stored in paise (`Int`), displayed as `₹` with `en-IN` locale.
- Phone numbers: normalized to E.164 (`+91XXXXXXXXXX`) for WhatsApp.
- Migrations: use `prisma migrate deploy` in production, never `db push` — schema changes must be versioned SQL files in `prisma/migrations/`.
- Rate limiting: use `rateLimit()` from `src/lib/rate-limit.ts` on auth and other sensitive endpoints.
- After running Playwright locally against a shared DB, purge test rows: `node --env-file=.env.local scripts/purge-e2e-records.mjs --execute`.
