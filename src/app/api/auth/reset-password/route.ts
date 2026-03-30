import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
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

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });
      return NextResponse.json({ message: "Password reset successfully" });
    }

    const intern = await prisma.intern.findUnique({ where: { email } });
    if (intern) {
      await prisma.intern.update({
        where: { id: intern.id },
        data: { passwordHash: newHash },
      });
      return NextResponse.json({ message: "Password reset successfully" });
    }

    return errorResponse("Account not found", 404);
  } catch (err) {
    return serverError(err, "reset-password");
  }
}
