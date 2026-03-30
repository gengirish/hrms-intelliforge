import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signJWT, setAuthCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth-email";
import { registerSchema } from "@/lib/validations";
import { errorResponse, serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 5, 60000)) {
      return errorResponse("Too many requests", 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 400);
    }

    const { email, password, name, accountType } = parsed.data;

    if (accountType === "admin") {
      return errorResponse("Admin accounts cannot be self-registered", 403);
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    const existingIntern = await prisma.intern.findUnique({ where: { email } });
    if (existingAdmin || existingIntern) {
      return errorResponse("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);

    let userId: string;
    let role: "admin" | "intern";

    const intern = await prisma.intern.create({
      data: {
        email,
        passwordHash,
        emailVerified: false,
        name,
        phone: "",
        college: "",
        branch: "",
        year: "",
        role: "",
        startDate: new Date(),
        durationWeeks: 0,
      },
    });
    userId = intern.id;
    role = "intern";

    try {
      await sendVerificationEmail(email, name);
    } catch (e) {
      console.error("Failed to send verification email:", e);
    }

    const token = await signJWT({ userId, role, email });
    const response = NextResponse.json(
      { message: "Account created", userId, role },
      { status: 201 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (err) {
    return serverError(err, "register");
  }
}
