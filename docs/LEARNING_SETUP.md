# Learning LMS Setup for HRMS

Wire HRMS to [learning.intelliforge.tech](https://learning.intelliforge.tech) for intern course enrollment, progress sync, and bootcamp registration.

## Quick setup

1. **Mint API key** on Learning → `/admin/api-keys` (scope: `write`)
2. **Add to Vercel** (HRMS project, Production + Preview):

```env
LEARNING_API_KEY=ifk_...

# Recommended for IntelliForge interns (auto-applied if omitted unless LEARNING_AUTO_ENROLL_DEFAULTS=false)
LEARNING_AUTO_ENROLL_COURSE_SLUGS=intelliforge-intern-onboarding,software-engineering-with-gen-ai
LEARNING_AUTO_REGISTER_SESSION=IntelliForge Intern Onboarding Stack Curriculum
```

3. **Run migration** on HRMS database:

```bash
npx prisma migrate deploy
```

4. **Deploy** `training-feedback` if using live session auto-register (`/api/v1/sessions/*`)

5. **Verify** — open HRMS dashboard → intern → Learning tab → Enroll / Sync progress

## Inspect live catalog

```bash
npm run learning:catalog
LEARNING_API_KEY=ifk_... npm run learning:catalog
```

## Production course reference (2026-06-24)

| Course | Slug | ID | Price |
|--------|------|-----|-------|
| **IntelliForge Intern Onboarding Stack Curriculum** | `intelliforge-intern-onboarding` | `cmopvq5bu0000l504vc68xxeg` | Free |
| Software Engineering with Gen AI | `software-engineering-with-gen-ai` | `cmn9qn8xy001fqy0opqc87lln` | Free |
| AI For Beginners (Microsoft Curriculum) | `ai-for-beginners` | `cmnwq5755001sqyxkz5k3h3uk` | Free |
| IntelliForge AI Training | `intelliforge-ai-training` | `cmmcyta7f0000qyb0oiqih2cs` | Free |

Intern onboarding course URL: https://learning.intelliforge.tech/courses/intelliforge-intern-onboarding

## Auto-provision behavior

When an intern becomes **ACTIVE** (offer accepted), HRMS automatically:

1. Enrolls them in courses from `LEARNING_AUTO_ENROLL_COURSE_SLUGS` or `LEARNING_AUTO_ENROLL_COURSE_IDS`
2. Registers them for bootcamp via `LEARNING_AUTO_REGISTER_SESSION` (participants API)
3. Optionally registers a live session via `LEARNING_AUTO_REGISTER_LIVE_SESSION_ID`
4. Syncs progress from Learning

Built-in defaults (when env slugs are unset):

- `intelliforge-intern-onboarding`
- `software-engineering-with-gen-ai`
- Bootcamp session title: **IntelliForge Intern Onboarding Stack Curriculum**

Disable defaults: `LEARNING_AUTO_ENROLL_DEFAULTS=false`

## See also

- [INTEGRATIONS.md](./INTEGRATIONS.md) — API endpoints, rotation, failure modes
- `training-feedback/onboarding-invite.md` — enrollment invite copy for interns
