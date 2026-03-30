import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { consumeToken } from "@/lib/auth-email";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hrms.intelliforge.tech")
  .trim()
  .replace(/<[^>]*>/g, "");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  const type = url.searchParams.get("type");

  if (!token || !email || !type) {
    return NextResponse.redirect(`${APP_URL}/sign-in?error=invalid_link`);
  }

  const tokenType =
    type === "magic" ? "MAGIC_LINK" : type === "verify" ? "EMAIL_VERIFY" : null;
  if (!tokenType) {
    return NextResponse.redirect(`${APP_URL}/sign-in?error=invalid_link`);
  }

  const record = await consumeToken(
    email,
    token,
    tokenType as "MAGIC_LINK" | "EMAIL_VERIFY"
  );
  if (!record) {
    return NextResponse.redirect(`${APP_URL}/sign-in?error=expired_link`);
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  const intern = await prisma.intern.findUnique({ where: { email } });
  const user = admin || intern;

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/sign-in?error=no_account`);
  }

  if (tokenType === "EMAIL_VERIFY") {
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { emailVerified: true },
      });
    } else if (intern) {
      await prisma.intern.update({
        where: { id: intern.id },
        data: { emailVerified: true },
      });
    }
  }

  const role = admin ? "admin" : "intern";
  const jwtToken = await signJWT({ userId: user.id, role, email });

  const redirectUrl =
    tokenType === "EMAIL_VERIFY"
      ? `${APP_URL}/sign-in?verified=true`
      : role === "admin"
        ? `${APP_URL}/dashboard`
        : `${APP_URL}/`;

  const response = NextResponse.redirect(redirectUrl);
  setAuthCookie(response, jwtToken);
  return response;
}
