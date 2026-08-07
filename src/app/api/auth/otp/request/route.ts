import { NextRequest, NextResponse } from "next/server";
import { findInternsByPhoneSuffix } from "@/lib/intern-phone";
import {
  isOtpConfigured,
  normalizePhoneE164,
  phoneSuffix10,
  requestLoginOtp,
  resolveInternByPhone,
} from "@/lib/otp";

export const dynamic = "force-dynamic";

/** POST { phone } → sends a WhatsApp login OTP to a known intern. */
export async function POST(req: NextRequest) {
  const input = (await req.json().catch(() => null)) as { phone?: string } | null;

  const phone = normalizePhoneE164(input?.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "invalid_phone", message: "Enter a valid phone number (e.g. +919876543210)" },
      { status: 400 }
    );
  }

  // A config gap must not surface as a bodyless 500 — the client parses this.
  if (!isOtpConfigured()) {
    console.error(
      "[otp/request] OTP API is not configured — set OTP_API_KEY (or WHATSAPP_HUB_API_KEY)"
    );
    return NextResponse.json(
      {
        error: "otp_not_configured",
        message: "WhatsApp login is unavailable right now. Please try again later.",
      },
      { status: 503 }
    );
  }

  // Only send to a number that resolves to exactly one sign-in-able intern:
  // messaging an arbitrary number costs money and spams a stranger, and a number
  // /verify will refuse as ambiguous is not worth a code either. Same resolution
  // as /verify, so the two can never disagree about who owns a number.
  // The response is identical either way so this cannot be used to enumerate
  // intern phone numbers.
  const matches = await findInternsByPhoneSuffix(phoneSuffix10(phone));
  const resolution = resolveInternByPhone(matches);
  if (resolution.kind !== "ok") {
    console.info(
      `[otp/request] number does not resolve to a single intern (${resolution.kind}) — not sending`
    );
    return NextResponse.json({ sent: true, resendInSeconds: 30 });
  }

  try {
    const { status, body } = await requestLoginOtp(phone);
    return NextResponse.json(body, { status });
  } catch (err) {
    console.error("[otp/request] OTP API call failed:", err);
    return NextResponse.json(
      {
        error: "otp_upstream_failed",
        message: "Couldn't send the code right now. Please try again.",
      },
      { status: 502 }
    );
  }
}
