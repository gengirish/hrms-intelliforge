# Clerk integration plan — IntelliForge HRMS

This document describes how to integrate [Clerk](https://clerk.com) into this product. It is tailored to the current stack: **Next.js 14 App Router**, **Prisma** (`Admin`, `Intern`, `Organization`), a custom **JWT** in the `hrms-session` cookie, and **middleware** that verifies the JWT and forwards `x-user-*` headers (including mentor-only access rules).

---

## 1. Decide scope (product + engineering)

Pick one primary model up front:

| Approach | When it fits |
|----------|----------------|
| **A. Clerk for workspace users only (`Admin`)** | You want SSO, MFA, and easier org admin lifecycle; interns stay on email/password or magic links (common for intern portals). |
| **B. Clerk for everyone (`Admin` + `Intern`)** | Single identity provider, consistent UX; more seats and webhook/sync work. |
| **C. Full replace of custom auth** | Long-term you remove JWT login, bcrypt, and most of the cookie-based session flow in `src/lib/auth.ts`. |

**Recommendation:** For an HRMS-style product, start with **A** or **C**—if interns must stay lightweight, **A** reduces risk; if you want one identity stack everywhere, plan **C** but roll it out in phases.

---

## 2. Clerk project and environment

- Create a Clerk application (separate **dev** and **prod** instances recommended).
- Add keys to hosting (e.g. Vercel):
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
- Optional: configure **JWT templates** or use Clerk session tokens if downstream services must verify identity without calling Clerk on every request.
- Align **authorized redirect URLs** and **allowed origins** with deployment domains.

---

## 3. Data model (Prisma)

Today `Admin` and `Intern` use internal cuids and `passwordHash`; the session JWT carries `sub`, `role`, `email`, `orgId`, and `adminOrgRole` for mentors.

### Minimum schema work

- Add a stable external id, e.g. `clerkUserId String? @unique` on `Admin` and (if in scope) `Intern`.
- For Clerk-only admins, plan for **`passwordHash` to be optional** (or a clear Clerk-only path) so bcrypt is not required for users who only authenticate via Clerk.
- Index lookups used on login/sync: by `clerkUserId` and by `email` for linking.

### Organization mapping

- Keep **`Organization` in PostgreSQL as the source of truth** unless you explicitly adopt Clerk Organizations end-to-end.
- Practical pattern: store `orgId` (and `orgAdminRole` / `accountType`) in Clerk **publicMetadata** or **privateMetadata** *after* the user is bound to a row—updated from your app or webhooks so middleware and APIs stay aligned with current rules.

---

## 4. Application wiring (Next.js App Router)

- Add `@clerk/nextjs` and wrap the root layout with **`ClerkProvider`**.
- Replace or redirect **`/sign-in`** and **`/sign-up`** to Clerk’s `<SignIn />` / `<SignUp />` components or Clerk-hosted pages; use redirects so existing bookmarks and emails keep working.
- Use **`auth().protect()`** or route groups so dashboard vs public vs intern onboarding matches the current route split.

---

## 5. Middleware (critical path)

Current behavior: `middleware.ts` verifies `hrms-session` with `jose`, sets `x-user-id`, `x-user-role`, `x-user-email`, `x-user-org-id`, and applies **MENTOR** restrictions (e.g. settings, hiring, billing, jobs, certain org APIs).

### Options

1. **Clerk-only middleware** (`clerkMiddleware`): after Clerk validates the session, resolve the Prisma user by `clerkUserId`, then set the same **`x-user-*` headers** so Server Components and route handlers change as little as possible.
2. **Transitional dual auth**: if a Clerk session exists, use the Clerk path; otherwise fall back to the JWT cookie (useful during migration).

Preserve **MENTOR** gates using **resolved session from Clerk + DB role**, not `auth().userId` alone.

---

## 6. Server session and `/api/auth/me`

Today `getSession()` reads the cookie; `GET /api/auth/me` loads `Admin` or `Intern` from Prisma.

### Target state

- Primary identity: **`auth()` from `@clerk/nextjs/server`** (or a verified Clerk JWT).
- Load `Admin` / `Intern` by `clerkUserId` (with explicit fallback rules during migration).
- **`AuthProvider`**: either keep calling `/api/auth/me` (simplest) or combine Clerk client hooks with `/api/auth/me` for **org-scoped HRMS fields** (recommended: thin Clerk on the client, rich user from your API).

---

## 7. Webhooks (provisioning and lifecycle)

Implement **`/api/webhooks/clerk`** and allow it in middleware public API prefixes (same pattern as existing webhooks).

Suggested events:

- **`user.created` / `user.updated`**: upsert or link by email or `clerkUserId`; avoid duplicate `Admin` / `Intern` rows.
- **`session.created`** (optional): refresh metadata if org context depends on it.
- **`organizationMembership.*`** (only if using Clerk Organizations): sync membership to your tables.

Verify signatures with `CLERK_WEBHOOK_SECRET`. Handlers must be **idempotent** (Clerk retries deliveries).

---

## 8. Invites and onboarding

Existing flows: **`AdminInvite`**, **`/create-org`**, **`/accept-admin-invite`**, intern onboarding.

- **Admin invites**: keep the token flow and attach **`clerkUserId`** on first Clerk sign-in, or move to **Clerk invitations** and map acceptance to org + role in Prisma.
- **Interns**: unchanged if they stay off Clerk; if they use Clerk, apply the same linking pattern and re-check public route lists (e.g. careers).

---

## 9. Migration strategy

- **New users**: webhooks create or link rows; first login runs “ensure org attached” (same idea as today’s 403 when `orgId` is missing).
- **Existing bcrypt users**: one-time **link account** after Clerk sign-in (match verified email), or an admin script that sets `clerkUserId` after users complete Clerk signup. Password hashes can remain until credential login is retired.
- **Cutover**: feature-flag Clerk on staging → production; remove legacy login routes when traffic is gone.

---

## 10. Security, compliance, and operations

- Least privilege in the Clerk dashboard; enable only the OAuth/social providers you need.
- Document **PII split**: what lives in Clerk vs PostgreSQL (intern PII may remain mostly in Prisma).
- Keep API rate limits and abuse protections on HRMS endpoints; Clerk covers much of auth-layer abuse.
- **E2E (Playwright)**: use Clerk testing utilities or dedicated test instances.

---

## 11. Phased delivery checklist

1. Clerk app + env vars; `ClerkProvider`; smoke-test sign-in.
2. Prisma migration (`clerkUserId`, optional `passwordHash` semantics for Clerk users).
3. Webhook + linking rules; validate on staging.
4. Middleware + header injection parity with current JWT behavior (including mentor rules).
5. Replace sign-in/up UI; wire navbar / `AuthProvider` sign-out to Clerk **`signOut`**.
6. Migrate existing admins (email match + support path as needed).
7. Remove dead code (JWT issuance, cookie helpers, duplicate middleware) only after monitoring confirms cutover.

---

## 12. Risks specific to this codebase

- **`middleware.ts` gates both pages and `/api/*`**: Clerk changes must preserve **401 JSON vs redirect** behavior for APIs vs HTML routes.
- **Two account types** (`admin` vs `intern`): Clerk is not a drop-in unless you always resolve **`accountType` and org role from Prisma** (or from Clerk JWT claims you fully control).
- **Mentor restrictions** should be enforced from **authoritative DB role** after resolving the user, not from client-tunable metadata alone.

---

## References in repo

| Area | Location |
|------|----------|
| Route protection + headers | `middleware.ts` |
| JWT session helpers | `src/lib/auth.ts` |
| Client auth context | `src/lib/auth-context.tsx` |
| Session-backed user API | `src/app/api/auth/me/route.ts` |
| Prisma models | `prisma/schema.prisma` (`Admin`, `Intern`, `Organization`, `AdminInvite`) |

---

*Last updated: plan authored for hrms-intelliforge integration discussion.*
