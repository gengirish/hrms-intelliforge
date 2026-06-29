# Observability (Sentry + PostHog)

IntelliForge HRMS ships with optional error tracking (Sentry) and product analytics (PostHog). Both integrations are **no-ops when env vars are unset** — local dev and preview deploys work without configuration.

## Sentry (error tracking)

### 1. Create a Sentry project

1. Sign in at [sentry.io](https://sentry.io) and create a project (platform: **Next.js**).
2. Copy the **DSN** from **Settings → Client Keys (DSN)**.

### 2. Vercel environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (to enable) | Client + server DSN |
| `SENTRY_AUTH_TOKEN` | Optional | Uploads source maps on build |
| `SENTRY_ORG` | Optional | Org slug for source maps |
| `SENTRY_PROJECT` | Optional | Project slug for source maps |

Add these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if desired).

### 3. Source maps (recommended for production)

1. Create an auth token at **Sentry → Settings → Auth Tokens** with `project:releases` and `org:read`.
2. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` on Vercel.
3. Redeploy — `withSentryConfig` in `next.config.mjs` uploads maps when `NEXT_PUBLIC_SENTRY_DSN` is set.

### 4. Verify

After deploy, trigger a test error (e.g. temporary throw in a dev-only route) or check **Sentry → Issues** after a real client error. The global `error.tsx` boundary reports unhandled React errors via `Sentry.captureException`.

### Files

- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `instrumentation.ts` — loads server/edge Sentry on boot
- `next.config.mjs` — wraps with `withSentryConfig` only when DSN is present

---

## PostHog (product analytics)

### 1. Create a PostHog project

1. Sign up at [posthog.com](https://posthog.com) (or use self-hosted).
2. Copy the **Project API Key** (`phc_…`) from **Project settings**.
3. Note the **API host** (US: `https://us.i.posthog.com`, EU: `https://eu.i.posthog.com`).

### 2. Vercel environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (to enable) | Project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Recommended | Ingest host (defaults to US if omitted) |

### 3. Consent

Analytics respects an **opt-in consent** cookie/localStorage key `ph_consent=1`. Until consent is granted:

- PostHog does not initialize
- `captureEvent()` calls are no-ops

Consent is granted automatically on **sign-in**, **sign-up**, and **org creation** via `grantAnalyticsConsent()`. For marketing pages, wire a cookie banner to call `grantAnalyticsConsent()` from `@/lib/posthog` when the user accepts.

Do-not-track (`DNT`) is respected via PostHog’s `respect_dnt` option.

### 4. Tracked events

| Event | When | Properties (sample) |
|-------|------|---------------------|
| `sign_up` | Successful registration | `email` |
| `sign_in` | Successful password login | `method: "password"` |
| `org_created` | Organization created | `slug`, `org_name` |
| `offer_accepted` | Intern accepts offer | `intern_id`, `role` |
| `attendance_punch` | Punch in/out | `type`, `mode` |
| `$pageview` | Route change | `$current_url` |

Signed-in users are identified via `posthog.identify` in `PostHogProvider` (user id, email, role, account type).

### 5. Verify

1. Set env vars locally or on a Preview deployment.
2. Sign in — consent is granted and events should appear in **PostHog → Activity**.
3. Filter by event name (e.g. `sign_in`).

### Files

- `src/lib/posthog.ts` — init, consent, `captureEvent`, `identifyUser`
- `src/components/posthog-provider.tsx` — provider, page views, auth identify

---

## Local development

```bash
# .env.local (optional)
NEXT_PUBLIC_SENTRY_DSN=https://…@….ingest.sentry.io/…
NEXT_PUBLIC_POSTHOG_KEY=phc_…
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Without these variables, `npm run dev` and `npm run build` behave as before.

To test PostHog without signing in, run in the browser console:

```js
localStorage.setItem("ph_consent", "1");
location.reload();
```

---

## Security notes

- Never commit `SENTRY_AUTH_TOKEN` or production DSN/keys to git.
- `NEXT_PUBLIC_*` vars are exposed to the browser — only use client-safe keys (Sentry DSN and PostHog project key are designed for this).
- PostHog session replay is not enabled by default; enable in PostHog project settings if needed.
