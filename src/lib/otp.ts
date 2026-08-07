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

import type { InternStatus } from "@prisma/client";

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

/**
 * Last 10 digits of a phone number, ignoring `+`, spaces and any other
 * separator. This is the join key between a verified OTP number and a stored
 * `Intern.phone`, which is *supposed* to be E.164 but is free text in the DB.
 */
export function phoneSuffix10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** The Intern fields the phone→account resolution needs. */
export type InternPhoneMatch = {
  id: string;
  email: string;
  name: string;
  orgId: string;
  status: InternStatus;
  deactivated: boolean;
};

export type InternPhoneResolution =
  | { kind: "ok"; intern: InternPhoneMatch }
  | { kind: "none" }
  | { kind: "ambiguous"; count: number };

/**
 * Pick the one intern a verified number should sign in as.
 *
 * `Intern.phone` is not unique and numbers get reused — an intern finishes and
 * is archived, a sibling joins on the family number, a candidate row carries the
 * same contact. Treating every one of those as a collision locked real people
 * out of accounts that were never actually ambiguous.
 *
 * So eligibility is narrowed before ambiguity is judged:
 *   1. Deactivated interns are never a sign-in target. Deactivation is a soft
 *      delete — such an account must not mint a session, and must not block a
 *      live one from doing so.
 *   2. ACTIVE wins outright. One ACTIVE match resolves even when PENDING,
 *      OFFERED or COMPLETED rows share the number.
 *   3. With no ACTIVE match, the remaining eligible rows are used as-is, so a
 *      COMPLETED alum can still sign in for their certificate.
 *
 * Only a genuine tie — two live ACTIVE accounts, or two non-ACTIVE ones with no
 * ACTIVE to prefer — is ambiguous, and there we still refuse rather than guess.
 */
export function resolveInternByPhone(
  matches: InternPhoneMatch[]
): InternPhoneResolution {
  const eligible = matches.filter((m) => !m.deactivated);
  if (eligible.length === 0) return { kind: "none" };

  const active = eligible.filter((m) => m.status === "ACTIVE");
  const tier = active.length > 0 ? active : eligible;

  if (tier.length === 1) return { kind: "ok", intern: tier[0] };
  return { kind: "ambiguous", count: tier.length };
}
