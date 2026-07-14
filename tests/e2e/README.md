# E2E tests (Playwright)



```bash

npm run test:e2e

```



When `E2E_BASE_URL` is unset, Playwright starts the Next.js dev server on **port 3001** (`playwright.config.ts`) so it does not conflict with a local app on 3000.



Optional: set `E2E_BASE_URL` to hit a deployed or already-running server instead.



## Credentials (optional signed-in flows)



| Variable | Used by |

|----------|---------|

| `E2E_INTERN_EMAIL` / `E2E_INTERN_PASSWORD` | Intern portal specs (`daily-plan`, `weekly-progress`) |

| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Admin marketplace specs (`marketplace.spec.ts`) |

| `E2E_MENTOR_EMAIL` / `E2E_MENTOR_PASSWORD` | Mentor weekly-progress review flow |



## Spec coverage



| Spec | Coverage |

|------|----------|

| `homepage.spec.ts` | Marketplace positioning, nav, pricing |

| `internships.spec.ts` | Public internship listings, apply flow, `/careers` redirect |

| `mentors.spec.ts` | Mentor directory, booking, public API |

| `marketplace.spec.ts` | Dashboard auth gates, revenue page, mentor profile editor |

| `api.spec.ts` | Auth guards + marketplace public/protected APIs |

| `navigation.spec.ts` | Route guards including marketplace pages |

| `careers.spec.ts` | Legacy `/api/careers` backward compatibility |



After E2E runs against a shared DB, purge test records:



```bash

node scripts/purge-e2e-records.mjs --execute

```

