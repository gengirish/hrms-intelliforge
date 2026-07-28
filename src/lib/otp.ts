/**
 * Server-side client for the hosted IntelliForge OTP API.
 *
 * HRMS is a tenant of the same service the WhatsApp hub belongs to, so the OTP
 * key falls back to WHATSAPP_HUB_API_KEY — one `if_live_` key serves both.
 *
 * Unlike products that delegate identity to Clerk, HRMS mints its own `jose`
 * session, so a verified OTP maps onto an existing Intern row (see
 * /api/auth/otp/verify) — this never creates accounts.
 *
 * Returns null config rather than throwing at import time; check
 * `isOtpConfigured()` before calling.
 */

const DEFAULT_OTP_URL = "https://intelliforge-otp-api.fly.dev";
const DEFAULT_TENANT_ID = "hrms";

/** Normalize Indian 10-digit or +91 numbers to E.164; null if invalid. */
export function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(phone)) return phone;
  return null;
}

function getOtpConfig() {
  const baseUrl = (process.env.OTP_SERVICE_URL ?? DEFAULT_OTP_URL).replace(/\/$/, "");
  const apiKey = process.env.OTP_API_KEY ?? process.env.WHATSAPP_HUB_API_KEY;
  const tenantId =
    process.env.OTP_TENANT_ID ?? process.env.WHATSAPP_TENANT_ID ?? DEFAULT_TENANT_ID;
  if (!apiKey) return null;
  return { baseUrl, apiKey, tenantId };
}

export function isOtpConfigured(): boolean {
  return getOtpConfig() !== null;
}

async function otpRequest<T>(
  path: string,
  init: RequestInit
): Promise<{ status: number; body: T }> {
  const cfg = getOtpConfig();
  if (!cfg) {
    throw new Error("OTP API is not configured (OTP_API_KEY / WHATSAPP_HUB_API_KEY)");
  }

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "X-Tenant-Id": cfg.tenantId,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

export type OtpRequestResult = {
  sent?: boolean;
  error?: string;
  retryInSeconds?: number;
  resendInSeconds?: number;
};

export type OtpVerifyResult = {
  verified?: boolean;
  phone?: string;
  reason?: string;
  attemptsLeft?: number;
};

/** Send a WhatsApp login OTP. `phoneE164` must be normalised. */
export function requestLoginOtp(phoneE164: string) {
  return otpRequest<OtpRequestResult>("/v1/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone: phoneE164, purpose: "login", channel: "whatsapp" }),
  });
}

/** Verify a login OTP code. On success the body has `{ verified: true, phone }`. */
export function verifyLoginOtp(phoneE164: string, code: string) {
  return otpRequest<OtpVerifyResult>("/v1/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: phoneE164, purpose: "login", code }),
  });
}
