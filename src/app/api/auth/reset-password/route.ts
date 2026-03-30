import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, clearAuthCookie } from "@/lib/auth";
import { consumeToken } from "@/lib/auth-email";
import { resetPasswordSchema } from "@/lib/validations";
import { errorResponse, serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 3, 60000)) {
      return errorResponse("Too many requests", 429);
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 400);
    }

    const { email, token, password } = parsed.data;

    const record = await consumeToken(email, token, "PASSWORD_RESET");
    if (!record) {
      return errorResponse("Invalid or expired reset link", 400);
    }

    const newHash = await hashPassword(password);

    // To invalidate existing JWTs on password change, add an integer `tokenVersion` column to
    // Admin and Intern in Prisma, default 0, and increment it here in the same update as passwordHash.
    // Then pass that value into signJWT on login and reject sessions where payload.tokenVersion !== user.tokenVersion.

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });
      const res = NextResponse.json({ message: "Password reset successfully" });
      clearAuthCookie(res);
      return res;
    }

    const intern = await prisma.intern.findUnique({ where: { email } });
    if (intern) {
      await prisma.intern.update({
        where: { id: intern.id },
        data: { passwordHash: newHash },
      });
      const res = NextResponse.json({ message: "Password reset successfully" });
      clearAuthCookie(res);
      return res;
    }

    return errorResponse("Account not found", 404);
  } catch (err) {
    return serverError(err, "reset-password");
  }
}
