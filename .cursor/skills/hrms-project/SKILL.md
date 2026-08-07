---
name: hrms-project
description: Provides architecture knowledge for the IntelliForge HRMS platform. Use when exploring the codebase, adding features, debugging, or asking about project structure, tech stack, conventions, database schema, or design system.
---

# IntelliForge HRMS — Project Architecture

## Project Context

IntelliForge HRMS is a **Next.js 14 monolith** for internship program management, hiring pipelines, and HR operations. Each customer organization (tenant) manages interns through onboarding, attendance, tasks, offers, learning, payouts, and communications. The platform integrates with WhatsApp, AgentMail, Stripe, RazorpayX, IntelliForge Learning, and an external Interview Bot API.

There is **no separate FastAPI/Python backend** in this repo — all API logic lives in Next.js Route Handlers under `src/app/api/`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| App Framework | Next.js 14 (App Router), React 18, TypeScript |
| Database | Neon (serverless PostgreSQL) |
| ORM | Prisma |
| Auth | JWT (jose) + bcrypt, HTTP-only session cookie |
| UI Components | Tailwind CSS, lucide-react icons |
| Forms | React Hook Form + Zod |
| State | React context (`auth-context`), local component state |
| Charts | Recharts |
| File Storage | Vercel Blob |
| Email | AgentMail TypeScript SDK |
| WhatsApp | Meta Business Cloud API + intent bot |
| PDF | @react-pdf/renderer |
| AI | OpenAI (document OCR, performance reviews, risk scoring) |
| Billing | Stripe (checkout, portal, webhooks) |
| Payouts | RazorpayX |
| Learning | IntelliForge Learning API |
| Interviews | External Interview Bot API (HTTP client) |
| E-sign | Digio |
| Calendar | Google Calendar API |
| Analytics | PostHog, Sentry |
| Testing | Vitest (unit), Playwright (E2E) |
| Deployment | Vercel |

## Project Structure

```
hrms-intelliforge/
├── src/
│   ├── app/                        # Next.js App Router (pages + API)
│   │   ├── api/                    # Route Handlers (REST endpoints)
│   │   │   ├── auth/               # Login, register, magic link, verify
│   │   │   ├── dashboard/          # Admin intern management
│   │   │   ├── jobs/               # Hiring pipeline CRUD + convert
│   │   │   ├── learning/           # Course catalog, enroll, sync
│   │   │   ├── payouts/            # Stipend payout batches
│   │   │   ├── webhooks/           # AgentMail, WhatsApp, Stripe, etc.
│   │   │   └── cron/               # Vercel cron endpoints
│   │   ├── dashboard/              # Admin UI pages
│   │   │   ├── hiring/             # Job postings + candidates
│   │   │   ├── payouts/            # Stipend disbursement
│   │   │   └── settings/           # Org, team, billing, integrations
│   │   ├── careers/                # Public job board
│   │   ├── sign-in/ sign-up/       # Auth pages
│   │   ├── create-org/             # New workspace onboarding
│   │   ├── intern-onboarding/      # Intern self-service onboarding
│   │   ├── attendance/ tasks/      # Intern portal pages
│   │   ├── daily-plan/             # Daily task planning
│   │   ├── weekly-progress/        # Weekly progress reports
│   │   └── offer/                  # Offer letter view + accept
│   ├── components/                 # React components
│   │   ├── dashboard/              # Admin subnav, charts
│   │   ├── hiring/                 # Candidate panels, scheduling
│   │   ├── learning/               # Enroll course modal
│   │   └── ui/                     # Shared UI primitives
│   └── lib/                        # Business logic & clients
│       ├── auth.ts                 # JWT, bcrypt, session cookie
│       ├── prisma.ts               # Prisma client singleton
│       ├── notifications.ts        # Unified email + WhatsApp orchestrator
│       ├── agentmail.ts            # AgentMail SDK wrapper
│       ├── whatsapp.ts             # WhatsApp Cloud API
│       ├── wa-bot/                 # WhatsApp intent bot (parser, executor)
│       ├── stripe.ts               # Stripe billing
│       ├── razorpay.ts             # RazorpayX payouts
│       ├── learning-client.ts      # Learning API client
│       ├── learning-provision.ts   # Auto-enroll on onboarding
│       ├── interview-bot-client.ts # External Interview Bot API
│       ├── esign.ts                # Digio e-sign
│       ├── google-calendar.ts      # Calendar scheduling
│       ├── ai/                     # OpenAI document OCR, reviews, scoring
│       ├── hiring/                 # Candidate status helpers
│       └── validations.ts          # Zod schemas
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                 # Versioned SQL migrations
│   └── seed.mjs                    # Bootstrap org + demo data
├── tests/
│   ├── unit/                       # Vitest unit tests
│   └── e2e/                        # Playwright E2E specs
├── scripts/                        # Maintenance & admin CLI scripts
├── docs/                           # Setup guides (AgentMail, WhatsApp)
├── .cursor/skills/                 # Cursor AI skills
├── vercel.json                     # Cron job config
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## Features

| Feature | Location | Notes |
|---------|----------|-------|
| **Intern portal** | `/attendance`, `/tasks`, `/daily-plan`, `/weekly-progress`, `/offer` | Self-service intern workflows |
| **Admin dashboard** | `/dashboard` | Intern lifecycle, analytics, notifications, learning |
| **Hiring pipeline** | `/dashboard/hiring`, `/careers` | Job postings, candidates, Interview Bot, convert to intern |
| **WhatsApp bot** | `src/lib/wa-bot/`, `/api/webhooks/whatsapp` | Attendance, tasks, offer accept, FAQ intents |
| **Stripe billing** | `/pricing`, `/api/billing/*`, `/api/webhooks/stripe` | Org subscription plans |
| **Learning integration** | `/api/learning/*`, `LearningEnrollment` model | Enroll + sync from learning.intelliforge.tech |
| **Payouts** | `/dashboard/payouts`, `/api/payouts/*` | RazorpayX stipend batches |
| **Interview Bot** | `interview-bot-client.ts`, `/api/webhooks/interview-bot` | External AI interview scores/reports |
| **E-sign offers** | `/api/offer/esign`, Digio webhook | Digital offer letter signing |
| **Multi-tenant** | `Organization` model, `/create-org`, `?org=slug` sign-up | Org-scoped data isolation |
| **Integrations health** | `/dashboard/settings` → Integrations tab | WhatsApp + AgentMail config status |

## Database Schema (Prisma)

Key models in `prisma/schema.prisma`:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Organization` | Tenant workspace | slug, plan, stripeCustomerId, whatsappPhoneId, agentmailInboxId |
| `Admin` | Org admin/mentor | orgId, email, passwordHash, role |
| `Intern` | Intern account | orgId, status, stipendPaise, mentorId, whatsappOptIn |
| `JobPosting` | Hiring role | orgId, slug, skills, interviewBotJobId, interviewLink |
| `Candidate` | Job applicant | jobPostingId, interviewScore, interviewStatus, convertedToIntern |
| `LearningEnrollment` | Learning course row | internId, courseId, progressPercent, learningEnrollmentId |
| `NotificationLog` | Delivery tracking | internId, channel, type, status, externalId |
| `StipendPayoutBatch` | Monthly payout run | orgId, month, status, totalPaise |
| `StipendPayout` | Per-intern payout | batchId, internId, amountPaise, razorpayPayoutId |
| `BotInteractionLog` | WhatsApp bot history | internId, intent, response, latencyMs |
| `WeeklyProgressReport` | Intern weekly report | internId, weekKey, mentorFeedback |
| `DailyTaskPlan` | Daily plan + items | internId, date, status |

All tenant-scoped tables have `orgId` (directly or via parent FK). Enums: `InternStatus`, `NotificationType`, `StipendPayoutStatus`, etc.

## User Roles

| Role | Access |
|------|--------|
| **Intern** | Portal pages — attendance, tasks, offer, onboarding |
| **Admin** | Full dashboard for their org — interns, hiring, payouts, settings |
| **Mentor** | Admin with mentees assigned via `Intern.mentorId` |

Auth is JWT-based: `signJWT({ userId, role, email })` stored in HTTP-only cookie. `getAuthAdmin()` / `getAuthIntern()` read session in Route Handlers.

## User Journeys

### Org Admin Flow
```
/create-org (or seed) → Dashboard → Manage interns
  → Hiring: create job → review candidates → convert to intern
  → Send offer → Track attendance/tasks → Enroll in Learning
  → Process stipend payouts → Mark complete
```

### Intern Flow
```
/sign-up?org=slug → Verify email → /intern-onboarding
  → Accept offer → Daily attendance + tasks + weekly progress
  → Complete program → Certificate
```

### Candidate Flow
```
/careers → Apply → (optional) Interview Bot → Admin reviews → Convert to intern
```

## Design System

Dark-first UI with glass-card aesthetic (see `src/app/globals.css`):

- **Background**: Slate-950 (`--surface-950`) with gradient overlays
- **Primary accent**: Blue-600 / Indigo-600 (`--brand-600`, indigo buttons)
- **Secondary accent**: Orange-500 (`--accent-500`) for CTAs
- **Success**: Emerald-500
- **Danger**: Red-400/500
- **Text**: Slate-100 primary, Slate-400 secondary/muted
- **Font**: System sans (Tailwind defaults)
- **Cards**: `glass-card` — dark translucent panels with border
- **Sign-in/up pages**: Dark slate-950 background, indigo gradient headings
- **Dashboard**: Dark theme with Recharts, status badges via `getStatusColor()`

Indian locale conventions: IST timezone, ₹ stipend in paise, DD/MM/YYYY dates.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | JWT signing (min 32 chars) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob file uploads |
| `AGENTMAIL_API_KEY` | AgentMail SDK |
| `AGENTMAIL_HR_INBOX_ID` | Default HR inbox |
| `WHATSAPP_*` | WhatsApp Cloud API credentials |
| `CRON_SECRET` | Vercel cron auth header |
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `DEFAULT_ORG_SLUG` | Org that public no-slug signups/applications attach to |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing |
| `RAZORPAY_*` | Payout disbursement |
| `LEARNING_API_*` | Learning platform integration |
| `INTERVIEW_BOT_API_URL` / `INTERVIEW_BOT_API_KEY` | External interview service |
| `OPENAI_API_KEY` | Document OCR, AI reviews |
| `DIGIO_*` | E-sign provider |

Per-org overrides exist on `Organization` for WhatsApp and AgentMail when tenants bring their own credentials.

## Naming Conventions

| Used for | Style | Example |
|----------|-------|---------|
| API routes | kebab-case dirs | `src/app/api/weekly-progress/` |
| Route Handlers | `route.ts` | `src/app/api/auth/login/route.ts` |
| React components | PascalCase | `CandidateDetailPanel.tsx` |
| lib modules | kebab-case or camelCase files | `learning-client.ts`, `auth.ts` |
| Prisma models | PascalCase | `JobPosting`, `LearningEnrollment` |
| DB columns (Prisma) | camelCase → snake_case in Postgres | `stipendPaise` → `stipend_paise` |
| Env vars | UPPER_SNAKE_CASE | `DATABASE_URL` |

## Key Rules

1. **Monolith only** — no separate backend service; all logic in `src/app/api/` and `src/lib/`
2. **Prisma for all DB access** — use `prisma` from `@/lib/prisma`; migrations in `prisma/migrations/`
3. **Multi-tenant isolation** — every query scoped by `orgId` from session; never trust client-supplied org ids
4. **Public signup org resolution** — `/api/auth/register` and `/api/mentors/apply` share `resolveOrgForPublicSignup()` (`src/lib/default-org.ts`): `orgSlug` → `DEFAULT_ORG_SLUG` env → sole org → 400
5. **Notifications go through `notify()`** — never call AgentMail/WhatsApp directly from routes
6. **Indian conventions** — IST dates, paise for money, E.164 phones for WhatsApp
7. **Versioned migrations** — use `prisma migrate deploy` in production, not `db push`
8. **Rate limiting** — use `rateLimit()` from `@/lib/rate-limit` on auth and sensitive endpoints
9. **E2E cleanup** — run `scripts/purge-e2e-records.mjs --execute` after Playwright runs

## Testing

```bash
npm test                              # Vitest unit tests (tests/unit/)
E2E_BASE_URL=http://localhost:3001 npm run test:e2e   # Playwright (port 3001)
```

## Related Skills

- `hrms-frontend` — Next.js UI patterns
- `hrms-database` — Prisma schema and migrations
- `hrms-testing` — Vitest + Playwright
- `hrms-agentmail` — Email integration
- `hrms-billing` — Stripe setup
