/**
 * Google Calendar integration for interview scheduling.
 *
 * ## Auth options
 *
 * ### 1. OAuth2 refresh token (implemented)
 * Use a Google Cloud OAuth client with Calendar scope. A workspace admin
 * completes the one-time consent flow; HRMS stores the refresh token in
 * `GOOGLE_CALENDAR_REFRESH_TOKEN` and exchanges it for short-lived access
 * tokens on each API call.
 *
 * ### 2. Service account (documented, not implemented here)
 * Create a service account, enable domain-wide delegation in Google Workspace,
 * and impersonate a calendar owner via `subject` when building the JWT client.
 * Suitable for org-wide automation without per-user consent, but requires
 * Workspace admin setup. See docs/GOOGLE_CALENDAR.md.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const DEFAULT_CALENDAR_TIMEZONE = "Asia/Kolkata";

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  timezone?: string;
  attendees?: string[];
}

export interface CreateCalendarEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    getEnv("GOOGLE_CALENDAR_CLIENT_ID") &&
      getEnv("GOOGLE_CALENDAR_CLIENT_SECRET") &&
      getEnv("GOOGLE_CALENDAR_REFRESH_TOKEN") &&
      getEnv("GOOGLE_CALENDAR_ID")
  );
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const clientId = getEnv("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CALENDAR_CLIENT_SECRET");
  const refreshToken = getEnv("GOOGLE_CALENDAR_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Calendar OAuth credentials are not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${detail}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

function getCalendarId(): string {
  const calendarId = getEnv("GOOGLE_CALENDAR_ID");
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID is not configured");
  }
  return calendarId;
}

function toRFC3339(date: Date): string {
  return date.toISOString();
}

function extractMeetLink(event: {
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
}): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );
  return video?.uri ?? null;
}

export async function createEvent(
  input: CreateCalendarEventInput
): Promise<CreateCalendarEventResult> {
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId();
  const timezone = input.timezone ?? DEFAULT_CALENDAR_TIMEZONE;
  const requestId = `hrms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const payload = {
    summary: input.title,
    description: input.description,
    start: {
      dateTime: toRFC3339(input.start),
      timeZone: timezone,
    },
    end: {
      dateTime: toRFC3339(input.end),
      timeZone: timezone,
    },
    attendees: (input.attendees ?? []).map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const url = new URL(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "all");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google Calendar create event failed: ${detail}`);
  }

  const event = (await res.json()) as {
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
  };

  return {
    eventId: event.id,
    meetLink: extractMeetLink(event),
    htmlLink: event.htmlLink ?? null,
  };
}

export async function cancelEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId();

  const url = new URL(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  );
  url.searchParams.set("sendUpdates", "all");

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404 || res.status === 410) {
    return;
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google Calendar cancel event failed: ${detail}`);
  }
}
