# IntelliForge HRMS — Intern Portal

Human Resource Management System for the IntelliForge AI internship program.  
Deployed at **[hrms.intelliforge.tech](https://hrms.intelliforge.tech)**

## Tech Stack

- **Next.js 14** (App Router)
- **Neon** (Serverless Postgres)
- **Prisma ORM**
- **Tailwind CSS**
- **Vercel Blob** (file storage)
- **AgentMail** TypeScript SDK (email automation)
- **WhatsApp Business Cloud API** (real-time WhatsApp messaging)
- **@react-pdf/renderer** (offer letter & certificate PDF)
- **Vercel** deployment

## Features

| Page | Description |
|------|-------------|
| `/` | Home — hero + action cards |
| `/sign-in` | Email + password login, magic link (passwordless) sign-in |
| `/sign-up` | Intern account registration with email verification |
| `/onboard` | Intern self-onboarding form with doc uploads + WhatsApp opt-in |
| `/offer` | Offer letter view + PDF download, accept offer |
| `/attendance` | Daily punch in/out with WFH/Office toggle |
| `/tasks` | Weekly task log with hours tracking |
| `/dashboard` | Admin panel — manage interns, send/approve offers, deactivate, notification history |

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
npx prisma db push
```

### 4. Admin Setup

Admin self-registration is disabled. Create admin accounts via a database script:

```bash
# Using the provided helper script
node scripts/create-admin.js
```

Or insert directly into the database:

```sql
INSERT INTO admins (id, email, "passwordHash", "emailVerified", role)
VALUES (gen_random_uuid(), 'hr@intelliforge.tech', '<bcrypt-hash>', true, 'ADMIN');
```

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

## API Routes

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create intern account |
| `/api/auth/login` | POST | Sign in with email + password |
| `/api/auth/me` | GET | Get current authenticated user (from JWT cookie) |
| `/api/auth/logout` | POST | Sign out (clears session cookie) |
| `/api/auth/magic-link` | POST | Send passwordless sign-in link via email |
| `/api/auth/verify` | GET | Verify email address or consume magic link token |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |

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

## Vercel Cron Jobs

Configured in `vercel.json`:

| Cron | Schedule | Description |
|------|----------|-------------|
| `/api/cron/task-reminder` | Monday 9:00 AM IST | Weekly task log reminder (email + WhatsApp) |
| `/api/cron/attendance-nudge` | Weekdays 10:30 AM IST | Daily attendance nudge (email + WhatsApp) |

## Database Models

### Notification-Related

| Model | Purpose |
|-------|---------|
| `NotificationLog` | Tracks every sent notification — channel, type, status, delivery timestamps, external IDs |
| `NotificationPreference` | Per-intern email/WhatsApp toggle |
| `Intern.whatsappOptIn` | Explicit WhatsApp consent (set during onboarding) |

## Indian Conventions

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
