# Clerk environment sync

How to connect this repo to your Clerk application and keep env vars aligned.

## Required variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys → Secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → endpoint → Signing secret |

Copy from `.env.example` into `.env.local` (local) and Vercel project settings (production).

## Webhook endpoint

Add in Clerk Dashboard:

```
https://<your-domain>/api/webhooks/clerk
```

Subscribe to: `user.created`, `user.updated`, `user.deleted`.

## Database migration

After pulling Clerk schema changes:

```bash
npx prisma migrate deploy
```

Migration: `20260616120000_clerk_user_ids` adds `clerkUserId` on `admins` / `interns` and makes `admins.passwordHash` optional.

## Dual auth

When Clerk keys are set:

- **Workspace admins** can sign up via `/create-org` → Clerk → `/auth/complete-clerk`
- **Legacy JWT** login remains for interns and existing password admins
- Middleware accepts either `hrms-session` JWT or Clerk session + `publicMetadata.hrms`

Without Clerk keys, `/create-org` uses the legacy email/password flow unchanged.

## Vercel Marketplace

If Clerk is installed via Vercel Marketplace, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` may be auto-provisioned. You still need to set `CLERK_WEBHOOK_SECRET` manually after creating the webhook.
