# Mentor Internship Platform

Internal mentor-led internship program and cohort management platform — mentor roster, cohort listings, accountability tracking, and stipend payouts.  
Deployed at **[hrms.intelliforge.tech](https://hrms.intelliforge.tech)**

## Architecture

**Next.js 14 monolith** — all UI, API routes, cron jobs, and webhooks run in a single Next.js App Router application. There is no separate FastAPI or Python backend in this repo.

| Layer | Technology |
|-------|------------|
| App framework | Next.js 14 (App Router), React 18, TypeScript |
| Database | Neon (serverless PostgreSQL) |
| ORM | Prisma |
| Auth | JWT (jose) + bcrypt passwords, HTTP-only session cookie |
| File storage | Vercel Blob |
| Email | AgentMail TypeScript SDK |
| Messaging | WhatsApp Business Cloud API |
| Billing | Stripe (subscriptions + checkout) |
| Payouts | RazorpayX |
| Learning | IntelliForge Learning API (`learning.intelliforge.tech`) |
| Interviews | External Interview Bot API (optional integration) |
| PDF | @react-pdf/renderer (offer letters, certificates) |
| Analytics | PostHog, Sentry |
| Deployment | Vercel |

```
src/
├── app/                    # Pages + API routes (Route Handlers)
│   ├── api/                # REST endpoints
│   ├── dashboard/          # Admin UI
│   ├── careers/            # Public job board
│   └── …                   # Intern portal pages
├── components/             # React components (shadcn-style UI)
└── lib/                    # Business logic, clients, validations
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Versioned SQL migrations
```

## Tech Stack

- **Next.js 14** (App Router) — monolith (frontend + API)
- **Neon** (Serverless Postgres)
- **Prisma ORM**
- **Tailwind CSS**
- **Vercel Blob** (file storage)
- **AgentMail** TypeScript SDK (email automation)
- **WhatsApp Business Cloud API** (real-time WhatsApp messaging + bot)
- **Stripe** (org billing)
- **RazorpayX** (stipend payouts)
- **@react-pdf/renderer** (offer letter & certificate PDF)
- **Vercel** deployment

## Features

### Intern portal

| Page | Description |
|------|-------------|
| `/` | Home — hero + action cards |
| `/sign-in` | Email + password login, magic link (passwordless) sign-in |
| `/sign-up` | Intern account registration with email verification |
| `/intern-onboarding` | Intern self-onboarding form with doc uploads + WhatsApp opt-in |
| `/offer` | Offer letter view + PDF download, accept offer |
| `/attendance` | Daily punch in/out with WFH/Office toggle |
| `/tasks` | Weekly task log with hours tracking |
| `/daily-plan` | Daily task plan (submit morning plan) |
| `/weekly-progress` | Weekly progress reports + mentor feedback |

### Admin dashboard

| Page | Description |
|------|-------------|
| `/dashboard` | Manage interns — offers, analytics, learning, notifications |
| `/dashboard/hiring` | Job postings, candidates, interview scores, convert to intern |
| `/dashboard/attendance` | Org-wide attendance overview |
| `/dashboard/tasks` | Admin task management per intern |
| `/dashboard/weekly-progress` | Review intern weekly progress |
| `/dashboard/payouts` | Stipend payout batches (RazorpayX) |
| `/dashboard/settings` | Org profile, team invites, billing, integrations |
| `/create-org` | Create a new workspace (org + admin account) |

### Public & billing

| Page | Description |
|------|-------------|
| `/careers` | Public job board |
| `/careers/[slug]` | Job detail + apply |
| `/pricing` | Subscription plans |
| `/about` | Product info |

## Hiring Pipeline

End-to-end hiring lives in `/dashboard/hiring` and the public careers pages:

1. **Create job posting** — Admin creates a role with skills, description, and optional Interview Bot link.
2. **Public apply** — Candidates apply at `/careers/[slug]` (resume upload, cover note).
3. **Interview Bot** — When configured, candidates receive an AI interview link; scores and reports sync via `/api/webhooks/interview-bot`.
4. **Review & schedule** — Admins review candidates, schedule Google Calendar events, and contact applicants.
5. **Convert to intern** — Approved candidates convert to intern records (`POST /api/jobs/[id]/convert`), entering the intern lifecycle.

Key models: `JobPosting`, `Candidate`, `ScheduledEvent`.

## Learning Integration

HRMS provisions course enrollments on **[IntelliForge Learning](https://learning.intelliforge.tech)** via the Learning v1 API:

- **Auto-enroll on onboarding** — Configurable course IDs/slugs (`LEARNING_AUTO_ENROLL_*` env vars).
- **Admin enroll** — Dashboard enroll modal calls `/api/learning/enroll`.
- **Progress sync** — `/api/learning/sync` refreshes progress from Learning; stored locally in `LearningEnrollment`.
- **Catalog** — `/api/learning/courses` lists available courses.

See `src/lib/learning-client.ts`, `src/lib/learning-provision.ts`, and `src/lib/learning-config.ts`.

## Integrations Health

Org-level integration status is visible under **Dashboard → Settings → Integrations**:

- **WhatsApp Business API** — Phone Number ID configured on the org
- **AgentMail** — HR inbox email configured on the org

Per-org overrides (`whatsappPhoneId`, `agentmailInboxId`, etc.) fall back to global env vars when unset. Webhook endpoints must remain reachable for delivery tracking and inbound replies (see [Webhooks](#6-webhooks)).

## WhatsApp Bot

Interns can interact via WhatsApp for attendance, tasks, offer acceptance, and FAQs. Inbound messages hit `/api/webhooks/whatsapp`; intent parsing and execution live in `src/lib/wa-bot/`. All bot interactions are logged in `BotInteractionLog`.

## Communication System

All outbound communication is routed through a **unified notification orchestrator** (`src/lib/notifications.ts`) that sends via both **Email** and **WhatsApp**, with full delivery tracking.

### Channels

| Channel | Provider | Code |
|---------|----------|------|
| Email | AgentMail (`hr@intelliforge.tech`) | `src/lib/agentmail.ts` |
| WhatsApp | Meta Business Cloud API | `src/lib/whatsapp.ts` |

### Notification Flows

Every notification goes through `notify(internId, type, data)` which handles channel routing, opt-in checks, and logging to `NotificationLog`:

| # | Event | Email | WhatsApp |
|---|-------|-------|----------|
| 1 | **Onboarding** | Welcome HTML with portal links | `intern_welcome` template |
| 2 | **Send Offer** | PDF attachment + offer details | `offer_letter` template (links to email for PDF) |
| 3 | **Accept Offer** | — | `offer_accepted` confirmation template |
| 4 | **Task Reminder** | HTML with task log link | `task_reminder` template |
| 5 | **Attendance Nudge** | HTML with attendance link | `attendance_nudge` template |
| 6 | **Completion** | Certificate PDF attachment | `completion_cert` template (links to email for PDF) |

### Offer Acceptance (Dual-Channel)

Interns can accept offers by replying on **either** channel:
- **Email**: Reply "I Accept" to the offer email → AgentMail webhook auto-activates
- **WhatsApp**: Reply "ACCEPT", "Yes", "Agree", or "Confirm" → WhatsApp webhook auto-activates

### Delivery Tracking

WhatsApp delivery statuses (sent → delivered → read) are tracked in real-time via webhook and stored in `NotificationLog`. Admins can view full notification history per intern in the dashboard **Notifications** tab.

**Detailed docs:**
- [AgentMail setup](./docs/AGENTMAIL.md) — webhook, IMAP/SMTP, mobile clients
- [WhatsApp Business setup](./docs/whatsapp-business-setup-guide.md) — Meta account, phone registration, templates

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd hrms-intelliforge
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/neondb?sslmode=require
JWT_SECRET=your-secret-at-least-32-chars    # openssl rand -hex 32
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
AGENTMAIL_API_KEY=am_your_api_key
AGENTMAIL_HR_INBOX_ID=hr@intelliforge.tech   # inbox ID from AgentMail console
CRON_SECRET=your-cron-secret
NEXT_PUBLIC_APP_URL=https://hrms.intelliforge.tech

# WhatsApp (optional — omit to use email-only)
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_APP_SECRET=your-meta-app-secret
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma migrate deploy   # applies versioned migrations
npx prisma db seed          # creates the IntelliForge AI org + demo data
```

> Use `prisma migrate deploy` (not `db push`) so production schema changes
> are governed by the SQL files in `prisma/migrations/`. The seed creates the
> default `IntelliForge AI` organization and the bootstrap admin
> `gen.girish@gmail.com`.

### 4. Admin Setup

Self-registration via `/api/auth/register` only creates **interns**. Admins
must be provisioned out-of-band, or created via `/create-org` when spinning up
a new workspace.

**Single-org bootstrap** — use the helper script (refuses to run if
0 or >1 organizations exist, to avoid creating an org-less admin):

```bash
node --env-file=.env.local scripts/create-admin.mjs hr@intelliforge.tech 'StrongPass!23' 'HR Bot'
```

The script bcrypt-hashes the password, sets `orgId` to the single
Organization, and `emailVerified=true` so the admin can log in immediately.
It upserts by email, so re-running just resets the password.

**New workspace** — visit `/create-org` to create an organization, slug, and
first admin account in one step (`POST /api/org`).

### 5. Run Development Server

```bash
npm run dev
```

### 6. Webhooks

Register both webhook URLs in their respective consoles:

**AgentMail** — [console.agentmail.to](https://console.agentmail.to) for the `hr@intelliforge.tech` inbox:
```
https://hrms.intelliforge.tech/api/webhooks/agentmail
```

**WhatsApp** — [developers.facebook.com](https://developers.facebook.com) in your app's WhatsApp Configuration:
```
https://hrms.intelliforge.tech/api/webhooks/whatsapp
```
Subscribe to the `messages` webhook field. See [WhatsApp setup guide](./docs/whatsapp-business-setup-guide.md) for full instructions.

**Stripe** — `/api/webhooks/stripe` for subscription events.  
**Interview Bot** — `/api/webhooks/interview-bot` for candidate score/report updates.  
**RazorpayX** — `/api/webhooks/razorpay` for payout status.  
**Digio** — `/api/webhooks/digio` for e-sign completion.

## Testing

### Unit tests

Vitest tests live in `tests/unit/` (auth helpers, validations, etc.):

```bash
npm test
```

### E2E tests (Playwright)

End-to-end specs live in `tests/e2e/`. Run against a dev server on **port 3001** so port 3000 stays free:

```bash
# Terminal 1 — start app on 3001
npm run dev -- -p 3001

# Terminal 2 — run Playwright against it
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

Playwright can also start the dev server automatically when `E2E_BASE_URL` is unset (defaults to port 3000).

## API Routes

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create intern account. Org resolution: `orgSlug` → `DEFAULT_ORG_SLUG` env → the sole org → 400 |
| `/api/auth/login` | POST | Sign in with email + password |
| `/api/auth/me` | GET | Get current authenticated user (from JWT cookie) |
| `/api/auth/logout` | POST | Sign out (clears session cookie) |
| `/api/auth/magic-link` | POST | Send passwordless sign-in link via email |
| `/api/auth/verify` | GET | Verify email address or consume magic link token |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |

**Intern registration with org slug**

When multiple organizations exist, registration should include an org slug (submissions without one fall back to `DEFAULT_ORG_SLUG`):

```bash
# UI: /sign-up?org=acme-corp
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123","orgSlug":"acme-corp"}'
```

The sign-up page reads `?org=slug`, fetches branding from `/api/orgs/[slug]/public`, and passes `orgSlug` to the register API.

### Organization

| Route | Method | Description |
|-------|--------|-------------|
| `/api/org` | POST | Create org + admin (used by `/create-org`) |
| `/api/orgs/[slug]/public` | GET | Public org name/logo for sign-up branding |

### Offer & Dashboard

| Route | Method | Description |
|-------|--------|-------------|
| `/api/offer` | GET | Get offer details for authenticated intern |
| `/api/offer/accept` | POST | Accept offer (intern self-service) |
| `/api/offer/pdf` | GET | Generate and download offer letter PDF on demand |
| `/api/dashboard` | GET | List all interns (admin only) |
| `/api/dashboard/intern` | GET | Get intern detail with attendance, tasks, emails |
| `/api/dashboard/action` | POST | Admin actions: `update_stipend`, `send_offer`, `approve_offer`, `send_reminder`, `mark_complete`, `deactivate`, `reactivate` |

### Notification APIs (Admin)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/notifications?internId=...` | GET | List notification history (paginated, filterable by channel) |
| `/api/notifications/send` | POST | Send manual notification to intern |
| `/api/notifications/preferences?internId=...` | GET | Get intern's notification preferences |
| `/api/notifications/preferences` | PUT | Update notification preferences + WhatsApp opt-in |

### Webhook Routes (Public)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/agentmail` | POST | AgentMail inbound — offer acceptance via email |
| `/api/webhooks/whatsapp` | GET | Meta webhook verification (challenge-response) |
| `/api/webhooks/whatsapp` | POST | WhatsApp inbound — offer acceptance + delivery status tracking |
| `/api/webhooks/stripe` | POST | Stripe subscription lifecycle |
| `/api/webhooks/interview-bot` | POST | Interview Bot score/report updates |
| `/api/webhooks/razorpay` | POST | RazorpayX payout status |
| `/api/webhooks/digio` | POST | Digio e-sign completion |

## Vercel Cron Jobs

Configured in `vercel.json`:

| Cron | Schedule | Description |
|------|----------|-------------|
| `/api/cron/task-reminder` | Monday 9:00 AM IST | Weekly task log reminder (email + WhatsApp) |
| `/api/cron/attendance-nudge` | Weekdays 10:30 AM IST | Daily attendance nudge (email + WhatsApp) |
| `/api/cron/daily-plan-nudge` | Weekdays 11:00 AM IST | Daily task plan reminder |
| `/api/cron/performance-scores` | Daily midnight IST | Compute weekly performance scores |

## Database Models

### Core

| Model | Purpose |
|-------|---------|
| `Organization` | Tenant workspace (slug, billing, integration overrides) |
| `Intern` | Intern account and lifecycle |
| `Admin` | Org admin/mentor accounts |
| `JobPosting` / `Candidate` | Hiring pipeline |
| `LearningEnrollment` | Learning platform course enrollments |
| `StipendPayoutBatch` / `StipendPayout` | Monthly stipend disbursements |

### Notification-Related

| Model | Purpose |
|-------|---------|
| `NotificationLog` | Tracks every sent notification — channel, type, status, delivery timestamps, external IDs |
| `NotificationPreference` | Per-intern email/WhatsApp toggle |
| `Intern.whatsappOptIn` | Explicit WhatsApp consent (set during onboarding) |

## Multi-Tenant Model

Every tenant-scoped row belongs to an `Organization`. The schema supports
**multi-tenant** operation: multiple orgs can coexist in one database.

### Workspaces

| Flow | How |
|------|-----|
| **New workspace** | `/create-org` → `POST /api/org` creates org + first admin |
| **Intern sign-up (no slug)** | `/sign-up` — attaches to `DEFAULT_ORG_SLUG`, or to the only org when there is just one |
| **Intern sign-up (multi org)** | `/sign-up?org=slug` — requires valid slug; shows org branding |
| **Admin scope** | All dashboard queries filter by `admin.orgId` |

### Hard invariants (enforced at the Postgres level)

| Table | Column | Constraint |
|-------|--------|------------|
| `interns` | `orgId` | `NOT NULL`, `FK → organizations.id ON DELETE CASCADE` |
| `admins` | `orgId` | `NOT NULL`, `FK → organizations.id ON DELETE CASCADE` |
| `job_postings` | `orgId` | `NOT NULL`, `FK → organizations.id ON DELETE CASCADE` |

Silent orphan rows (`orgId IS NULL`) are structurally impossible. Org-scoped
queries like `/api/dashboard` and `/api/attendance` filter by
`admin.orgId`, so any admin only sees rows in their own org.

### How `orgId` is assigned at write time

| Code path | How it sets `orgId` |
|-----------|---------------------|
| `POST /api/auth/register` | `resolveOrgForPublicSignup()`: `orgSlug` → `DEFAULT_ORG_SLUG` → sole org; 400 if still ambiguous |
| `POST /api/mentors/apply` | Same `resolveOrgForPublicSignup()` path as register |
| `POST /api/org` | Creates new org; admin gets new org's id |
| `POST /api/jobs/[id]/convert` | From `session.orgId` of the authenticated admin |
| `POST /api/jobs` (create job) | From `session.orgId` of the authenticated admin |
| `prisma/seed.mjs` | Creates the org first, then attaches admins/interns at create time |

If you ever need to verify the invariant or repair drift, see
[Maintenance Scripts](#maintenance-scripts) below.

## Maintenance Scripts

All scripts in `scripts/` are **dry-run by default** and idempotent. They
read `DATABASE_URL` from `.env.local` (or any file passed to
`node --env-file=...`).

| Script | Purpose | Apply with |
|--------|---------|------------|
| `diagnose-hr-interns.mjs` | Audit visibility per admin: counts admins/interns by org, shows what each admin can/cannot see via `/api/dashboard` | (read-only) |
| `purge-e2e-records.mjs` | Delete every E2E test row (orgs `slug LIKE 'e2e-%'`, admins/interns/candidates `@test.intelliforge.tech`, related verification tokens). Cascades through FKs. | `--execute` |
| `consolidate-single-org.mjs` | Move every admin/intern into the single Organization. Used to repair drift, e.g. interns that were created with `orgId = NULL` before the constraint was added. | `--execute` |
| `delete-intern.mjs <email>` | Delete a single intern (with cascade footprint preview). | `--execute` |
| `create-admin.mjs <email> <pwd> [name]` | Provision an admin account (refuses to create an org-less one). | runs immediately |

Typical flows:

```bash
# After every E2E run
node --env-file=.env.local scripts/purge-e2e-records.mjs            # dry run
node --env-file=.env.local scripts/purge-e2e-records.mjs --execute  # apply

# Diagnose "why doesn't admin X see intern Y?"
node --env-file=.env.local scripts/diagnose-hr-interns.mjs
```

## Intern Lifecycle

```
PENDING ──send_offer──→ OFFERED ──approve_offer / accept──→ ACTIVE ──mark_complete──→ COMPLETED
   ↑                                                          ↓
onboard                                                   deactivate / reactivate
```

- **send_offer**: Admin sends offer letter (generates PDF, emails via AgentMail). Only if stipend > 0.
- **approve_offer**: Admin manually approves (OFFERED → ACTIVE). Alternatively, intern accepts via `/offer` page or email reply.
- **deactivate / reactivate**: Soft delete — deactivated interns are excluded from cron jobs and hidden by default in dashboard.

## Indian Conventions

- Dates: DD/MM/YYYY display, ISO in DB
- Timezone: Asia/Kolkata (IST)
- Stipend: stored in paise (Int), displayed as ₹ with `en-IN` locale
- Phone: stored as-is, normalized to E.164 (`+91XXXXXXXXXX`) for WhatsApp
- File uploads: Vercel Blob storage

## License

© 2026 IntelliForge AI. All rights reserved.
