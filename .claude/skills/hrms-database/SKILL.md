---
name: hrms-database
description: Prisma + Neon Postgres patterns for IntelliForge HRMS — schema changes, versioned migrations, tenant (orgId) scoping, transactions, and one-off production data fixes. Use when editing prisma/schema.prisma, writing a migration, adding or changing a Prisma query, or running a script against the database.
---

# HRMS Database (Prisma + Neon Postgres)

## Stack

| Piece | Where |
|---|---|
| ORM | Prisma 5 (`prisma-client-js`), schema in `prisma/schema.prisma` |
| Database | Neon Postgres (`DATABASE_URL`) |
| Client | `import { prisma } from "@/lib/prisma"` — a single cached `PrismaClient`; never `new PrismaClient()` in app code |
| Migrations | `prisma/migrations/<timestamp>_<name>/migration.sql`, applied by `prisma migrate deploy` |
| Seed | `prisma/seed.mjs` |

There is no SQLAlchemy, Alembic or Redis cache in this repo. Rate limiting may use Upstash Redis, but no application data lives there.

## Commands

```bash
npm run db:generate       # prisma generate
npm run db:migrate:dev    # prisma migrate dev  — create a migration locally
npm run db:migrate        # prisma migrate deploy
npm run db:studio         # prisma studio
```

The `db:*` scripts run through `scripts/run-with-local-env.mjs`, which loads `.env` then `.env.local` and exits if `DATABASE_URL` is unset.

**Production migrations run on every Vercel build**: `npm run build` is `prisma migrate deploy && prisma generate && next build`. A migration merged to `master` is applied to the production database minutes later, before the new code is live — so migrations must be backward compatible with the currently deployed code (add columns as nullable or with a default; drop or rename only in a later deploy).

## Schema-change workflow

1. Edit `prisma/schema.prisma`.
2. Write the migration as a versioned SQL file. Either run `npm run db:migrate:dev -- --name <name>` against a dev database, or hand-write `prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql` in Prisma's style:
   ```sql
   -- AlterTable
   ALTER TABLE "candidates" ADD COLUMN "hIndex" INTEGER;
   ```
3. `npm run db:generate`, then `npx tsc --noEmit`.
4. Never use `prisma db push` against a shared or production database.

## Conventions

- Models are PascalCase and mapped to snake_case plural tables with `@@map("job_postings")`. Columns stay camelCase in Postgres (quoted, e.g. `"orgId"`).
- IDs: `String @id @default(cuid())`.
- Money is `Int` paise (`stipendPaise`, `hourlyRatePaise`); dates are `DateTime` stored in UTC and displayed in IST.
- Status fields are either Prisma enums (`InternStatus`, `TaskStatus`, `EsignStatus`, …) or `String` with a documented set of values (e.g. `Admin.role` = `ADMIN` | `MENTOR`, `JobPosting.formType` = `STANDARD` | `EXPERT_NETWORK`).
- Add `@@index` for every foreign key and for the filter columns you query by.

## Tenant scoping

Every read and write must be limited to the caller's organization, taken from `session.orgId` — never from the request body.

How each model is tied to an `Organization`:

| Scoping | Models |
|---|---|
| Required `orgId` + FK `onDelete: Cascade` | `Admin`, `Intern`, `AdminInvite`, `JobPosting`, `MentorApplication`, `MarketplaceTransaction` |
| `orgId` column without an FK | `OfferEsignRequest`, `StipendPayoutBatch`, `ScheduledEvent`, `MentorProfile`, `MentorBooking` |
| Optional `orgId` | `WebhookEvent` (ledger only) |
| Through a parent | `Attendance`, `Task`, `DailyTaskPlan`, `WeeklyProgressReport`, `NotificationLog`, `LearningEnrollment`, `StipendPayout`, … via `Intern`; `Candidate` via `JobPosting` |

For parent-scoped models, check the parent's `orgId` before acting:

```ts
const job = await prisma.jobPosting.findUnique({ where: { id }, select: { orgId: true } });
if (!job || job.orgId !== session.orgId) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
const candidates = await prisma.candidate.findMany({ where: { jobPostingId: id } });
```

For interns, use `getInternForAdmin(admin, internId)` (`src/lib/admin-intern-access.ts`), which also limits a MENTOR to their own mentees. Return 404, not 403, for another org's record.

Public, sessionless signup endpoints resolve the org with `resolveOrgForPublicSignup()` (`src/lib/default-org.ts`).

## Transactions and uniqueness

- Use `prisma.$transaction([...])` when writes must succeed together (e.g. `POST /api/jobs/[id]/convert` creates the `Intern` and marks the `Candidate` converted).
- For "only once" guarantees, rely on a unique constraint and catch Prisma error `P2002` rather than check-then-insert. `claimWebhookEvent()` in `src/lib/webhook-idempotency.ts` is the reference pattern.

## One-off data fixes in production

Maintenance scripts live in `scripts/*.mjs`, are dry-run by default, and need `--execute` to write:

```bash
node --env-file=.env.local scripts/<name>.mjs            # dry run
node --env-file=.env.local scripts/<name>.mjs --execute
```

For an ad-hoc fix: read the target rows first, update by a unique key (`id` or `slug`), print before/after, and get explicit approval before writing to production. If `.env.local` has no `DATABASE_URL`, check `.env` — and confirm which database the host points to before writing.

After Playwright runs against a shared database: `node --env-file=.env.local scripts/purge-e2e-records.mjs --execute`.
