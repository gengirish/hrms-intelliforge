---
name: hrms-linkedin-mentor
description: Import LinkedIn profiles into IntelliForge mentor marketplace accounts. Use when building or debugging LinkedIn-to-mentor workflows, /api/mentors/import-linkedin, or onboarding mentors from social profiles.
---

# LinkedIn → Mentor Profile Workflow

## What it does

Turns a LinkedIn profile into a `MentorProfile` (and optionally a new `Admin` with `MENTOR` role) using OpenAI structured extraction.

## In-app entry points

| Who | Where | Action |
|-----|-------|--------|
| Mentor (self) | `/dashboard/mentor-profile` | **Import from LinkedIn** → `action: apply-self` |
| Org admin | `/dashboard/mentors/import` | **Create mentor from LinkedIn** → `action: create-mentor` |

## API

`POST /api/mentors/import-linkedin` (authenticated)

### Preview (mentor or admin)

```json
{
  "action": "preview",
  "linkedinUrl": "https://www.linkedin.com/in/jane-doe/",
  "profileText": "optional pasted About + Experience"
}
```

Returns `{ draft, source, warning? }`.

### Apply to signed-in mentor

```json
{
  "action": "apply-self",
  "linkedinUrl": "...",
  "profileText": "...",
  "isPublic": false
}
```

Upserts `MentorProfile` for the current admin.

### Create mentor + profile (full admin only)

```json
{
  "action": "create-mentor",
  "linkedinUrl": "...",
  "profileText": "...",
  "email": "mentor@company.com",
  "password": "********",
  "confirmPassword": "********",
  "sendWelcomeEmail": true,
  "isPublic": false
}
```

1. `assertCanAddMentor(orgId)`
2. `createOrgAdminDirect` with `MENTOR` role
3. `upsertMentorProfileForAdmin` with extracted fields

## LinkedIn fetch reality

LinkedIn blocks most server-side fetches. **Always recommend pasting profile text** (About, headline, skills, experience). The UI shows a warning when only URL-only extraction runs.

## Key files

- `src/lib/ai/linkedin-mentor-import.ts` — URL normalize + OpenAI extraction
- `src/app/api/mentors/import-linkedin/route.ts` — preview / apply / create
- `src/components/mentors/linkedin-import-form.tsx` — shared UI
- `src/lib/validations.ts` — `linkedInImportPreviewSchema`, `linkedInImportApplySchema`, `linkedInImportCreateSchema`

## Env

- `OPENAI_API_KEY` — required for extraction

## Agent workflow (Cursor)

When the user provides a LinkedIn URL in chat:

1. Ask them to paste About + Experience if the draft looks thin.
2. Call preview mentally or via API locally.
3. For production onboarding, direct them to `/dashboard/mentors/import` or use the API with admin session.
4. Never scrape LinkedIn aggressively; respect ToS — pasted text is the supported path.

## MentorProfile fields mapped

| LinkedIn signal | DB field |
|-----------------|----------|
| Name | `Admin.name` (create flow) |
| Headline | `headline` |
| About + roles | `bio` |
| Skills / stack | `expertise[]` |
| Career length | `yearsExperience` |
| Profile URL | `linkedinUrl` |
| GitHub (if visible) | `githubUrl` |

## Testing

```bash
npx vitest run tests/unit/linkedin-mentor-import.test.ts
```
