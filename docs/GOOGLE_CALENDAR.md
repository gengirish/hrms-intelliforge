# Google Calendar — Interview Scheduling

This document explains how to connect **IntelliForge HRMS** to Google Calendar for live interview scheduling with Google Meet links. When credentials are not set, admins can still schedule interviews and download an `.ics` calendar file as a fallback.

**Code references:**

| Item | Location |
|------|----------|
| Google Calendar client | [`src/lib/google-calendar.ts`](../src/lib/google-calendar.ts) |
| ICS fallback helper | [`src/lib/ics.ts`](../src/lib/ics.ts) |
| IST date/time helpers | [`src/lib/scheduling.ts`](../src/lib/scheduling.ts) |
| Scheduling API | [`src/app/api/scheduling/events/route.ts`](../src/app/api/scheduling/events/route.ts) |
| Cancel API | [`src/app/api/scheduling/events/[id]/route.ts`](../src/app/api/scheduling/events/[id]/route.ts) |
| Hiring UI | [`src/app/dashboard/hiring/page.tsx`](../src/app/dashboard/hiring/page.tsx) |
| Schedule modal | [`src/components/hiring/schedule-interview-modal.tsx`](../src/components/hiring/schedule-interview-modal.tsx) |
| Env template | [`.env.example`](../.env.example) |

---

## Overview

- **Admin-only** — only org admins can create, list, or cancel scheduled interviews.
- **Timezone** — all UI defaults use **Asia/Kolkata (IST)**.
- **Google configured** — creates a Calendar event with a Google Meet link and emails attendees.
- **Google not configured** — saves the event in HRMS and returns an `.ics` file for manual import.

---

## Environment variables

```text
GOOGLE_CALENDAR_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=hr@yourcompany.com
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_CALENDAR_REFRESH_TOKEN` | Long-lived refresh token (one-time consent) |
| `GOOGLE_CALENDAR_ID` | Target calendar ID — use `primary` or a shared calendar email |

All four must be set for Google integration. If any is missing, the ICS fallback is used automatically.

---

## Option A: OAuth2 refresh token (implemented)

Best for a single shared hiring calendar owned by an HR mailbox.

### 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Google Calendar API** (APIs & Services → Library → Google Calendar API → Enable).

### 2. Configure OAuth consent screen

1. APIs & Services → **OAuth consent screen**.
2. Choose **Internal** (Workspace) or **External** (any Google account).
3. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
4. Add test users if the app is in **Testing** mode.

### 3. Create OAuth credentials

1. APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Add authorized redirect URI (for the one-time token exchange), e.g. `http://localhost:3000/oauth2callback` or use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
4. Copy **Client ID** and **Client secret** into `.env`.

### 4. Obtain a refresh token

**Using OAuth 2.0 Playground (quickest):**

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon → check **Use your own OAuth credentials** → enter Client ID and Secret.
3. In Step 1, select **Google Calendar API v3** → `https://www.googleapis.com/auth/calendar`.
4. Click **Authorize APIs** and sign in as the calendar owner (e.g. `hr@yourcompany.com`).
5. In Step 2, click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** → `GOOGLE_CALENDAR_REFRESH_TOKEN`.

> Store the refresh token securely. Revoke access in [Google Account → Security → Third-party access](https://myaccount.google.com/permissions) if compromised.

### 5. Set the calendar ID

- Use `primary` for the authenticated user's main calendar, or
- Use a shared calendar email (e.g. `hr@yourcompany.com`) if that calendar is writable by the OAuth account.

```text
GOOGLE_CALENDAR_ID=primary
```

### 6. Deploy to Vercel

Add all four variables in **Project → Settings → Environment Variables** for Preview and Production.

---

## Option B: Service account (documented, not implemented)

Use when you need server-to-server access without a user refresh token, typically with **Google Workspace domain-wide delegation**.

1. Create a **Service account** in Google Cloud Console.
2. Enable domain-wide delegation and authorize these scopes in Workspace Admin:
   - `https://www.googleapis.com/auth/calendar`
3. Share the target calendar with the service account email (or impersonate a user via `subject`).
4. Use the service account JSON key with `googleapis` JWT auth instead of refresh tokens.

This path requires Workspace admin access and is not wired in `src/lib/google-calendar.ts` today. Option A is simpler for most HRMS deployments.

---

## API contract

All routes require an **admin** session (`role: admin`, valid `orgId`).

### `POST /api/scheduling/events`

Schedule an interview for a candidate.

**Request body:**

```json
{
  "candidateId": "clx...",
  "title": "Interview: Jane Doe — Software Engineer Intern",
  "description": "Technical round with panel",
  "startAt": "2026-07-01T04:30:00.000Z",
  "endAt": "2026-07-01T05:15:00.000Z",
  "timezone": "Asia/Kolkata",
  "attendeeEmails": ["panel@company.com"]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `candidateId` | Yes | Must belong to the admin's org |
| `title` | No | Defaults to `Interview: {name} — {job title}` |
| `description` | No | Event notes / agenda |
| `startAt` | Yes | ISO 8601 datetime |
| `endAt` | Yes | Must be after `startAt` |
| `timezone` | No | Default `Asia/Kolkata` |
| `attendeeEmails` | No | Extra attendees; candidate email is always included |

**Response `201`:**

```json
{
  "event": {
    "id": "clx...",
    "orgId": "...",
    "candidateId": "...",
    "title": "...",
    "startAt": "...",
    "endAt": "...",
    "meetLink": "https://meet.google.com/...",
    "status": "SCHEDULED"
  },
  "googleConfigured": true,
  "icsContent": null
}
```

When Google is not configured, `icsContent` contains the raw `.ics` file text and `meetLink` is null.

### `GET /api/scheduling/events`

List scheduled events for the org.

**Query params:**

| Param | Description |
|-------|-------------|
| `candidateId` | Optional — filter by candidate |

**Response `200`:**

```json
{
  "events": [ { "id": "...", "title": "...", "startAt": "...", "meetLink": "...", "status": "SCHEDULED" } ],
  "googleConfigured": true
}
```

### `DELETE /api/scheduling/events/[id]`

Cancel an event. Deletes from Google Calendar when configured, then marks status `CANCELLED` in the database.

**Response `200`:**

```json
{ "ok": true }
```

---

## UI usage

1. Go to **Dashboard → Hiring**.
2. Open a job and click **Schedule** on a candidate row (or **Schedule interview** in the detail panel).
3. Pick date/time in IST, optional notes, and click **Schedule**.
4. View upcoming interviews in the modal; cancel with the trash icon.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `.ics` downloads instead of Meet link | Set all four `GOOGLE_CALENDAR_*` env vars |
| `Google OAuth token refresh failed` | Re-run OAuth Playground; refresh token may be revoked |
| `Google Calendar create event failed: 403` | Calendar not shared with OAuth user, or missing Calendar API scope |
| Attendees not emailed | Ensure `sendUpdates=all` is allowed; check spam; verify attendee emails |
| Wrong time in calendar | Confirm `timezone` is `Asia/Kolkata`; UI inputs are IST |

---

## Database

Events are stored in `scheduled_events` (`ScheduledEvent` model). See migration `prisma/migrations/20260629120200_scheduled_events/`.
