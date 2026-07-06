# E2E tests (Playwright)

```bash
npm run test:e2e
```

When `E2E_BASE_URL` is unset, Playwright starts the Next.js dev server on **port 3001** (`playwright.config.ts`) so it does not conflict with a local app on 3000.

Optional: set `E2E_BASE_URL` to hit a deployed or already-running server instead.

Credentials for signed-in flows: `E2E_INTERN_EMAIL`, `E2E_INTERN_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (see individual specs).
