# IntelliForge HRMS — Intern Portal

Human Resource Management System for the IntelliForge AI internship program.  
Deployed at **[hrms.intelliforge.tech](https://hrms.intelliforge.tech)**

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Auth + Storage)
- **Prisma ORM**
- **Tailwind CSS**
- **AgentMail** TypeScript SDK (email automation)
- **@react-pdf/renderer** (offer letter & certificate PDF)
- **Vercel** deployment

## Features

| Page | Description |
|------|-------------|
| `/` | Home — hero + action cards |
| `/onboard` | Intern self-onboarding form with doc uploads |
| `/offer` | Offer letter view — lookup by email, accept |
| `/attendance` | Daily punch in/out with WFH/Office toggle |
| `/tasks` | Weekly task log with hours tracking |
| `/dashboard` | Admin panel — manage interns, send offers, view emails |

## AgentMail Email Flows

1. **Onboarding** → `createInternInbox()` creates dedicated inbox
2. **Send Offer** → PDF generated → `sendOfferLetter()` with attachment
3. **Accept Offer** → Intern replies "I Accept" → webhook auto-activates
4. **Task Reminder** → Cron (Monday 9AM IST) → `sendTaskReminder()`
5. **Attendance Nudge** → Cron (Daily 10:30AM IST) → `sendAttendanceNudge()`
6. **Completion** → Certificate PDF → `sendCompletionEmail()`

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
AGENTMAIL_API_KEY=am_your_api_key
CRON_SECRET=your-cron-secret
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Supabase Storage

Create a public bucket named `hrms-docs` in your Supabase project.

### 5. Admin Setup

Insert your admin email into the `admins` table:

```sql
INSERT INTO admins (id, email, role) VALUES (gen_random_uuid(), 'admin@intelliforge.tech', 'ADMIN');
```

### 6. Run Development Server

```bash
npm run dev
```

### 7. AgentMail Webhook

Register this URL in [AgentMail Console](https://console.agentmail.to):
```
https://hrms.intelliforge.tech/api/webhooks/agentmail
```

## Vercel Cron Jobs

Configured in `vercel.json`:

| Cron | Schedule | Description |
|------|----------|-------------|
| `/api/cron/task-reminder` | Monday 9:00 AM IST | Weekly task log reminder |
| `/api/cron/attendance-nudge` | Weekdays 10:30 AM IST | Daily attendance nudge |

## Indian Conventions

- Dates: DD/MM/YYYY display, ISO in DB
- Timezone: Asia/Kolkata (IST)
- Stipend: stored in paise (Int), displayed as ₹ with `en-IN` locale
- File uploads: Supabase Storage bucket `hrms-docs`

## License

© 2026 IntelliForge AI. All rights reserved.
