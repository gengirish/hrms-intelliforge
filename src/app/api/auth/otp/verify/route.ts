import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOtpConfigured, normalizePhoneE164, verifyLoginOtp } from "@/lib/otp";
import { setAuthCookie, signJWT } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST { phone, code } → verifies the OTP and issues the standard hrms-session
 * cookie, so an intern can sign in from WhatsApp without a password.
 *
 * This authenticates existing interns only — it never creates an account.
 * Interns are created by HR, so an unknown number is a rejection, not a signup.
 */
export async function POST(req: NextRequest) {
  const input = (await req.json().catch(() => null)) as {
    phone?: string;
    code?: string;
  } | null;

  const phone = normalizePhoneE164(input?.phone);
  if (!phone || !input?.code) {
    return NextResponse.json(
      { error: "invalid_request", message: "phone and code are required" },
      { status: 400 }
    );
  }

  if (!isOtpConfigured()) {
    console.error(
      "[otp/verify] OTP API is not configured — set OTP_API_KEY (or WHATSAPP_HUB_API_KEY)"
    );
    return NextResponse.json(
      {
        error: "otp_not_configured",
        message: "WhatsApp login is unavailable right now. Please try again later.",
      },
      { status: 503 }
    );
  }

  let status: number;
  let body: Awaited<ReturnType<typeof verifyLoginOtp>>["body"];
  try {
    ({ status, body } = await verifyLoginOtp(phone, input.code));
  } catch (err) {
    console.error("[otp/verify] OTP API call failed:", err);
    return NextResponse.json(
      {
        error: "otp_upstream_failed",
        message: "Couldn't verify the code right now. Please try again.",
      },
      { status: 502 }
    );
  }

  if (body.verified !== true) {
    // Pass through the OTP API's failure (401 incorrect / 410 expired / 429 …).
    return NextResponse.json(body, { status });
  }

  const last10 = (body.phone ?? phone).replace(/^\+/, "").slice(-10);
  const interns = await prisma.intern.findMany({
    where: { phone: { contains: last10 } },
    select: { id: true, email: true, name: true, orgId: true },
    take: 2,
  });

  if (interns.length === 0) {
    return NextResponse.json(
      { error: "no_account", message: "No intern account uses this number." },
      { status: 404 }
    );
  }

  // Intern.phone is not unique, so a shared number is ambiguous — refuse rather
  // than guess which account to sign in.
  if (interns.length > 1) {
    console.error("[otp/verify] multiple interns share this number — refusing sign-in");
    return NextResponse.json(
      {
        error: "ambiguous_phone",
        message: "This number is linked to more than one account. Sign in with email.",
      },
      { status: 409 }
    );
  }

  const intern = interns[0];
  const token = await signJWT({
    userId: intern.id,
    role: "intern",
    email: intern.email,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: intern.id,
      email: intern.email,
      name: intern.name,
      role: "intern",
    },
  });
  setAuthCookie(response, token);
  return response;
}
