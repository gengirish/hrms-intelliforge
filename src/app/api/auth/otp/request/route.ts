import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOtpConfigured, normalizePhoneE164, requestLoginOtp } from "@/lib/otp";

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

  // Only send to a number that already belongs to an intern: messaging an
  // arbitrary number costs money and spams a stranger. The response is
  // identical either way so this cannot be used to enumerate intern phones.
  const last10 = phone.replace(/^\+/, "").slice(-10);
  const known = await prisma.intern.findFirst({
    where: { phone: { contains: last10 } },
    select: { id: true },
  });

  if (!known) {
    console.info("[otp/request] no intern for supplied number — not sending");
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
