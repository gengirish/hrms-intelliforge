import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { forgotPasswordSchema } from "@/lib/validations";
import { errorResponse, serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 3, 60000)) {
      return errorResponse("Too many requests. Try again in a minute.", 429);
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Valid email is required", 400);
    }

    const { email } = parsed.data;

    const admin = await prisma.admin.findUnique({ where: { email } });
    const intern = await prisma.intern.findUnique({ where: { email } });
    const user = admin || intern;

    if (user) {
      const name = "name" in user ? user.name : undefined;
      await sendPasswordResetEmail(email, name);
    }

    return NextResponse.json({
      message: "If an account exists, a password reset link has been sent.",
    });
  } catch (err) {
    return serverError(err, "forgot-password");
  }
}
