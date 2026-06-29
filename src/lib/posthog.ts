import posthog from "posthog-js";

export const CONSENT_COOKIE = "ph_consent";
export const CONSENT_STORAGE_KEY = "ph_consent";

export function isPostHogConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  if (document.cookie.split("; ").some((c) => c === `${CONSENT_COOKIE}=1`)) {
    return true;
  }
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function grantAnalyticsConsent(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, "1");
  } catch {
    /* ignore quota errors */
  }
  initPostHog();
  window.dispatchEvent(new Event("ph-consent-granted"));
}

let initialized = false;

export function initPostHog(): typeof posthog | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !hasAnalyticsConsent()) return null;
  if (initialized && posthog.__loaded) return posthog;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage+cookie",
    respect_dnt: true,
  });
  initialized = true;
  return posthog;
}

export function getPostHog(): typeof posthog | null {
  if (!isPostHogConfigured() || !hasAnalyticsConsent()) return null;
  if (!initialized || !posthog.__loaded) return initPostHog();
  return posthog;
}

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  getPostHog()?.capture(event, properties);
}

export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  getPostHog()?.identify(userId, traits);
}

export function resetPostHog(): void {
  if (posthog.__loaded) {
    posthog.reset();
    initialized = false;
  }
}
