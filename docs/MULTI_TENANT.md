# Multi-tenant intern signup

IntelliForge HRMS attaches every intern to an `Organization`. Self-service registration (`POST /api/auth/register`) must therefore resolve which org a new intern belongs to.

## How org resolution works

| Scenario | Behavior |
|----------|----------|
| `orgSlug` provided in register body | Look up org by slug; **404** if not found |
| No `orgSlug`, exactly **one** org in DB | Use that org (legacy single-tenant deployments) |
| No `orgSlug`, **zero** orgs | **503** — no org configured |
| No `orgSlug`, **multiple** orgs | **400** — slug required |

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
| 400 | `Organization slug is required when multiple organizations exist` |
| 404 | `Organization not found` |

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
2. Update any hard-coded `/sign-up` links to include `?org=<slug>`.
3. Update CI/scripts that call `create-admin.mjs` or `create-test-weekly-progress-users.mjs` to pass `--org-id` when multiple orgs are present.
4. Self-registration without `orgSlug` will return **400** once a second org is added — this is intentional to prevent interns landing in the wrong tenant.

### No schema changes

This feature uses the existing `Organization.slug` field. No Prisma migration is required.
