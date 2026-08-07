# Multi-tenant intern signup

IntelliForge HRMS attaches every intern to an `Organization`. Self-service registration (`POST /api/auth/register`) must therefore resolve which org a new intern belongs to.

## How org resolution works

Resolution lives in one place — `resolveOrgForPublicSignup()` (`src/lib/default-org.ts`) — and is shared by both public signup-style endpoints: `POST /api/auth/register` and `POST /api/mentors/apply`.

| Scenario | Behavior |
|----------|----------|
| `orgSlug` provided in the request body | Look up org by slug; **404** if not found |
| No `orgSlug`, `DEFAULT_ORG_SLUG` env set and matching | Use that org |
| No `orgSlug`, exactly **one** org in DB | Use that org (legacy single-tenant deployments) |
| No `orgSlug`, **zero** orgs | **503** — no org configured |
| No `orgSlug`, **multiple** orgs and no usable default | **400** — cannot disambiguate |

### `DEFAULT_ORG_SLUG`

The public marketing pages (`/mentors/apply`, and `/sign-up` reached without `?org=`) carry no org slug, so once a second `Organization` row exists every submission on them would be refused. `DEFAULT_ORG_SLUG` names the tenant that owns those pages:

```
DEFAULT_ORG_SLUG=intelliforge-ai
```

**Set this in Vercel (all environments) as soon as a second org is created.** A stale value (slug no longer exists) is logged as an error and falls through to the org-count rules, so a single-tenant deployment keeps working.

## Intern invite / signup links

Share an org-scoped signup URL with candidates:

```
https://<your-domain>/sign-up?org=<org-slug>
```

Optional `redirect` query param sends the user somewhere after account creation (e.g. onboarding):

```
/sign-up?org=acme-corp&redirect=/intern-onboarding
```

The sign-up page:

1. Reads `?org=<slug>` from the URL
2. Fetches public branding via `GET /api/orgs/<slug>/public`
3. Sends `orgSlug` in the registration request

## API contracts

### `POST /api/auth/register`

**Request body** (existing fields plus optional org):

```json
{
  "email": "intern@example.com",
  "password": "securepass",
  "name": "Jane Doe",
  "orgSlug": "acme-corp"
}
```

`orgSlug` is optional when only one organization exists.

**New / changed errors:**

| Status | Message |
|--------|---------|
| 400 | `We couldn't tell which organization this is for. Please use the link your organization sent you.` |
| 404 | `Organization not found` |
| 503 | `No organization is configured yet. Please contact support.` |

### `GET /api/orgs/:slug/public`

Unauthenticated. Returns org branding for signup pages.

**Response 200:**

```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response 404:** `{ "error": "Organization not found" }`

### `GET /api/careers/:jobSlug`

Job detail now includes `org.slug` alongside `org.name` and `org.logoUrl`.

## Careers flow

After a candidate applies on `/careers/[jobSlug]`, the success screen links to org-scoped signup so they can create an account under the hiring organization before completing intern onboarding.

## Admin / test user scripts

When more than one organization exists, provisioning scripts require `--org-id`:

```bash
node --env-file=.env.local scripts/create-admin.mjs --org-id <uuid> admin@example.com 'Passw0rd!' 'Admin Name'

node --env-file=.env scripts/create-test-weekly-progress-users.mjs --org-id <uuid> "Test1234!"
```

Without `--org-id`, scripts list available orgs (`id`, `slug`, `name`) and exit.

With exactly one org, `--org-id` is optional (backward compatible).

## Migration notes for existing deployments

### Single-org production (most common today)

**No action required.** Registration continues to work without `orgSlug` as long as exactly one organization row exists.

Optionally publish your org-specific signup link:

```
/sign-up?org=<your-org-slug>
```

Find the slug in the database (`organizations.slug`) or via the admin dashboard org settings.

### Moving to multiple orgs

1. Ensure each organization has a unique `slug` (set at org creation via `/create-org`).
2. Set `DEFAULT_ORG_SLUG` to the tenant that owns the public pages. Without it, `/mentors/apply` and a bare `/sign-up` return **400** as soon as a second org exists.
3. Update any hard-coded `/sign-up` links to include `?org=<slug>`.
4. Update CI/scripts that call `create-admin.mjs` or `create-test-weekly-progress-users.mjs` to pass `--org-id` when multiple orgs are present.
5. Submissions that carry neither `orgSlug` nor a usable `DEFAULT_ORG_SLUG` still return **400** — that guard is intentional, to prevent people landing in the wrong tenant.

### No schema changes

This feature uses the existing `Organization.slug` field. No Prisma migration is required.
