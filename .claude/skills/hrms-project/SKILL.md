---
name: hrms-project
description: Architecture map of the IntelliForge HRMS Next.js monolith — structure, features, Prisma models, auth and roles, tenant rules, integrations and conventions. Use when exploring this codebase, planning or adding a feature, debugging across modules, or answering where something lives.
---

# IntelliForge HRMS — Project Architecture

## Project Context

IntelliForge HRMS is a **Next.js 14 monolith** for internship programmes, hiring, a mentor marketplace and HR operations. Each organization (tenant) manages interns through onboarding, attendance, tasks, offers, learning, payouts and communications. Production: **https://hrms.intelliforge.tech** on Vercel, with Neon Postgres.

There is **no separate backend** (no FastAPI, Python or Docker service) — all API logic lives in Route Handlers under `src/app/api/`, business logic in `src/lib/`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| App framework | Next.js 14 (App Router), React 18, TypeScript |
| Database / ORM | Neon Postgres + Prisma 5 (see `hrms-database` skill) |
| Auth | JWT (`jose`) + `bcryptjs`, HTTP-only `hrms-session` cookie; WhatsApp OTP sign-in for interns |
| UI | Tailwind CSS, lucide-react icons, `sonner` toasts, Recharts |
| Forms | Component state + `fetch`; Zod validation on the server (`src/lib/validations.ts`, per-route schemas) |
| File storage | Vercel Blob (resumes, documents) |
| Email | AgentMail TypeScript SDK (see `hrms-agentmail` skill) |
| WhatsApp | Central WhatsApp hub (preferred) or Meta Cloud API directly; intent bot in `src/lib/wa-bot/` |
| PDF | `@react-pdf/renderer` (offer letters, certificates) |
| AI | OpenAI (document OCR, performance reviews, LinkedIn import) |
| Billing / payouts | Stripe subscriptions; RazorpayX stipend and mentor payouts |
| Other integrations | IntelliForge Learning API, external Interview Bot API, Digio e-sign, Google Calendar |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`), in-memory fallback |
| Observability | Sentry (errors, cron check-ins), PostHog (product analytics) |
| Testing | Vitest (unit), Playwright (E2E on port 3001) |

## Project Structure

```
hrms-intelliforge/
├── src/
│   ├── middleware.ts               # JWT check, session headers, MENTOR restrictions
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/               # login, register, magic-link, otp/, verify, reset
│   │   │   ├── dashboard/          # Admin intern management + action endpoint
│   │   │   ├── careers/ internships/  # Public job listing + apply
│   │   │   ├── jobs/               # Hiring CRUD, candidates, convert
│   │   │   ├── mentors/ mentor-applications/ marketplace/  # Mentor marketplace
│   │   │   ├── learning/ payouts/ billing/ scheduling/ documents/
│   │   │   ├── webhooks/           # agentmail, whatsapp, stripe, razorpay, digio, interview-bot
│   │   │   └── cron/               # Vercel crons (CRON_SECRET)
│   │   ├── dashboard/              # hiring, mentors, mentor-applications, mentor-profile,
│   │   │                           # marketplace, payouts, settings, attendance, tasks, weekly-progress
│   │   ├── internships/            # Public job board + apply (/careers redirects here)
│   │   ├── mentors/                # Public mentor directory + apply
│   │   ├── sign-in/ sign-up/ create-org/ accept-admin-invite/ reset-password/
│   │   └── intern-onboarding/ attendance/ tasks/ daily-plan/ weekly-progress/ offer/
│   ├── components/                 # auth, dashboard, hiring, learning, marketing, mentors, shared
│   └── lib/
│       ├── auth.ts                 # signJWT, getSession, getAuthAdmin, getAuthIntern
│       ├── prisma.ts               # Prisma client singleton
│       ├── mentor-access.ts        # MENTOR page/API block rules used by middleware
│       ├── admin-intern-access.ts  # getInternForAdmin, hasFullOrgAdminAccess
│       ├── default-org.ts          # resolveOrgForPublicSignup
│       ├── notifications.ts        # notify(): email + WhatsApp + NotificationLog
│       ├── agentmail.ts auth-email.ts
│       ├── whatsapp.ts whatsapp-hub.ts wa-bot/
│       ├── otp.ts                  # WhatsApp OTP + resolveInternByPhone
│       ├── offer-acceptance.ts     # acceptOffer(), isAcceptanceReply()
│       ├── webhook-idempotency.ts  # claimWebhookEvent / releaseWebhookEvent
│       ├── hiring/                 # candidate-status, expert-network
│       ├── marketplace.ts marketplace-payouts.ts plan-limits.ts
│       ├── stripe.ts razorpay.ts esign.ts learning-*.ts interview-bot-client.ts
│       ├── rate-limit.ts cron-monitor.ts posthog.ts
│       └── validations.ts utils.ts
├── prisma/                         # schema.prisma, migrations/, seed.mjs
├── tests/unit/  tests/e2e/
├── scripts/                        # Dry-run-by-default maintenance scripts (--execute to write)
├── docs/                           # Setup guides
├── .claude/skills/ .cursor/skills/ .agents/skills/   # Identical skill sets
└── vercel.json                     # Crons
```

## Features

| Feature | Location | Notes |
|---------|----------|-------|
| **Intern portal** | `/attendance`, `/tasks`, `/daily-plan`, `/weekly-progress`, `/offer` | Self-service intern workflows |
| **Admin dashboard** | `/dashboard` | Intern lifecycle via `POST /api/dashboard/action`, analytics, notifications, learning |
| **Hiring pipeline** | `/dashboard/hiring`, `/internships/[slug]` | Postings, candidates, Interview Bot, convert to intern; `EXPERT_NETWORK` postings for partner researcher networks with referrals and H-index payouts |
| **Mentor marketplace** | `/mentors`, `/mentors/apply`, `/dashboard/mentor-applications`, `/dashboard/marketplace` | Public mentor profiles, applications reviewed by admins, bookings, ratings, platform fee (`Organization.platformFeeBps`) |
| **LinkedIn mentor import** | `/api/mentors/import-linkedin` | See `hrms-linkedin-mentor` skill |
| **WhatsApp bot** | `src/lib/wa-bot/`, `/api/webhooks/whatsapp` | Attendance, tasks, offer accept, FAQ intents |
| **WhatsApp OTP sign-in** | `/api/auth/otp/request`, `/api/auth/otp/verify` | Maps a verified number onto an existing intern; never creates accounts; per-IP rate limits |
| **Offer acceptance** | `src/lib/offer-acceptance.ts` | `acceptOffer()` shared by email, WhatsApp, portal, admin and Digio e-sign |
| **Stripe billing** | `/pricing`, `/api/billing/*`, `/api/webhooks/stripe` | Plans and limits in `plan-limits.ts` |
| **Payouts** | `/dashboard/payouts`, `/api/payouts/*` | RazorpayX stipend batches; full ADMIN only |
| **Learning** | `/api/learning/*`, `LearningEnrollment` | Enroll + sync with learning.intelliforge.tech |
| **Interview Bot** | `interview-bot-client.ts`, `/api/webhooks/interview-bot` | External AI interview scores/reports |
| **E-sign offers** | `/api/offer/esign`, Digio webhook | Digital offer letter signing |
| **Webhook idempotency** | `webhook-idempotency.ts`, `WebhookEvent` | Dedupes provider retries |
| **Multi-tenant** | `Organization`, `/create-org`, `?org=slug` sign-up | Org-scoped data |
| **Integrations health** | `/dashboard/settings` → Integrations | WhatsApp + AgentMail status |

## Database Schema (Prisma)

| Model | Purpose | Key fields |
|-------|---------|------------|
| `Organization` | Tenant | slug, plan, maxInterns, maxMentors, platformFeeBps, marketplaceEnabled |
| `Admin` | Org admin or mentor | orgId, email, passwordHash, `role` (`ADMIN` \| `MENTOR`) |
| `Intern` | Intern account | orgId, status (`InternStatus`), stipendPaise, mentorId, phone, whatsappOptIn |
| `JobPosting` | Hiring role | orgId, slug, formType (`STANDARD` \| `EXPERT_NETWORK`), interviewBotJobId, interviewLink |
| `Candidate` | Applicant | jobPostingId, interviewStatus, interviewScore, convertedToIntern, expertDomain, hIndex, referrerEmail, referralConsent |
| `MentorProfile` / `MentorApplication` / `MentorBooking` / `MentorRating` | Marketplace | profile slug, isPublic, hourlyRatePaise; application status `PENDING` \| `APPROVED` \| `REJECTED` |
| `MarketplaceTransaction` | Platform fee ledger | orgId, status |
| `StipendPayoutBatch` / `StipendPayout` | Payouts | month, totalPaise / amountPaise, razorpayPayoutId |
| `NotificationLog` | Delivery tracking | internId, channel, type, status, externalId |
| `WeeklyProgressReport` / `DailyTaskPlan` | Intern reporting | internId, weekKey (unique per intern) / date |
| `LearningEnrollment` | Learning course | internId, courseId, progressPercent |
| `OfferEsignRequest` | Digio signing | internId, orgId, status (`EsignStatus`) |
| `WebhookEvent` | Webhook dedupe | provider + eventId unique, optional orgId |

Only `Admin`, `Intern`, `AdminInvite`, `JobPosting`, `MentorApplication` and `MarketplaceTransaction` have a required `orgId` with a cascading FK. Most intern data (`Attendance`, `Task`, `NotificationLog`, …) is scoped through `Intern`, and `Candidate` through `JobPosting` — check the parent's `orgId` before acting.

## Auth, Roles and Access

| Role | Access |
|------|--------|
| **Intern** | Portal pages; password, magic link or WhatsApp OTP sign-in |
| **Admin (`ADMIN`)** | Full dashboard for their org |
| **Admin (`MENTOR`)** | Limited: own mentees (`Intern.mentorId`), mentor profile; blocked from hiring, settings, payouts, mentor applications, marketplace admin, billing and jobs APIs |

- Session: `signJWT({ userId, role: "admin" | "intern", email, orgId, adminOrgRole })`, 7-day `hrms-session` cookie.
- `src/middleware.ts` verifies the JWT and injects `x-user-id`, `x-user-role`, `x-user-email`, `x-user-org-id`, `x-user-admin-org-role`; `getSession()` reads those headers first. Cron and webhook routes are public in middleware and authenticate themselves.
- MENTOR rules live in `src/lib/mentor-access.ts`; add new admin-only pages/APIs there. Handlers that move money or change org config also call `hasFullOrgAdminAccess()` because the JWT role can be up to 7 days stale.

## User Journeys

```
Org admin:  /create-org → Dashboard → Hiring (post → review → convert) → send_offer
            → attendance/tasks → Learning enroll → payouts → mark_complete
Intern:     /sign-up?org=slug → verify → /intern-onboarding → accept offer (any channel)
            → attendance, tasks, daily plan, weekly progress → certificate
Candidate:  /internships/[slug] → apply (HR alert + confirmation email)
            → optional Interview Bot → admin review → convert to intern
Expert:     /internships/[slug] (EXPERT_NETWORK) → apply or refer with consent
            → admin reviews profile + referral payout → forwarded to partner by hand
Mentor:     /mentors/apply → admin approves in /dashboard/mentor-applications
            → Admin(MENTOR) + MentorProfile created → bookings and ratings
```

## Design System

Dark-first UI with a glass-card look (`src/app/globals.css`): slate-950 background, indigo/brand-600 primary, orange accent for CTAs, emerald success, red danger; `glass-card` panels; status badges via helpers such as `CandidateStatusBadge`. Indian conventions: IST dates (DD/MM/YYYY via `formatDateIST`), money in paise shown with `formatINR`, E.164 phone numbers.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres |
| `JWT_SECRET` | JWT signing (≥ 32 chars) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `AGENTMAIL_API_KEY` / `AGENTMAIL_HR_INBOX_ID` | Email sending inbox |
| `HR_ALERT_EMAILS` | HR alert recipients — never `hr@intelliforge.tech` |
| `WEBHOOK_SECRET` | AgentMail webhook header secret |
| `WHATSAPP_HUB_URL` / `WHATSAPP_HUB_API_KEY` | Use the central WhatsApp hub; unset key = direct Meta (`WHATSAPP_*`) |
| `CRON_SECRET` | `Authorization: Bearer` for `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `DEFAULT_ORG_SLUG` | Org for sessionless public signups when several orgs exist |
| `STRIPE_*`, `RAZORPAY_*`, `DIGIO_*` (incl. webhook secrets) | Billing, payouts, e-sign |
| `LEARNING_API_*`, `INTERVIEW_BOT_*` | Learning platform, Interview Bot |
| `OPENAI_API_KEY` | AI features |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared rate limiting |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_*` | Observability |

`.env.example` is the full list.

## Key Rules

1. **Monolith only** — logic in `src/app/api/` and `src/lib/`.
2. **Prisma for all DB access** via `@/lib/prisma`; versioned SQL migrations, `prisma migrate deploy` in production, never `db push`.
3. **Tenant isolation** — scope every query by `session.orgId` (directly or via the parent); never trust a client-supplied org id.
4. **Public signup org resolution** — `resolveOrgForPublicSignup()`: `orgSlug` → `DEFAULT_ORG_SLUG` → sole org → 400.
5. **Intern notifications go through `notify()`**. Transactional mail to non-interns (candidates, mentor applicants, auth) uses the helpers in `agentmail.ts` / `auth-email.ts` directly — await it.
6. **Offer acceptance goes through `acceptOffer()`** — never set an intern ACTIVE in a route.
7. **Webhooks** verify their own signature, then `claimWebhookEvent()` before side effects; `releaseWebhookEvent()` + 5xx on failure.
8. **MENTOR guards** belong in `mentor-access.ts`; money/config handlers also re-check with `hasFullOrgAdminAccess()`.
9. **Rate limiting** — `rateLimit()` / `rateLimitAsync()` with `getClientIp()` on auth and public write endpoints.
10. **Indian conventions** — IST, paise, E.164.
11. **Pushing to `master` deploys production** and runs migrations; CI order is lint → typecheck → unit → build → e2e.
12. **E2E cleanup** — `node --env-file=.env.local scripts/purge-e2e-records.mjs --execute` after Playwright runs against a shared DB.

## Testing

```bash
npm test                     # Vitest (tests/unit/**/*.test.ts)
npx vitest run tests/unit/<file>.test.ts
npx tsc --noEmit             # typecheck
npm run lint
npm run test:e2e             # Playwright; starts Next on :3001
```

## Related Skills

- `hrms-database` — Prisma schema, migrations, tenant scoping, data fixes
- `hrms-agentmail` — email sending, alerts, AgentMail webhook
- `hrms-linkedin-mentor` — LinkedIn → mentor profile import
- `ui-ux-pro-max` — general UI/UX design reference
