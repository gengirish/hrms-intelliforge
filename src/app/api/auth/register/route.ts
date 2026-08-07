import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signJWT, setAuthCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth-email";
import { registerSchema } from "@/lib/validations";
import { errorResponse, serverError } from "@/lib/api-utils";
import { assertCanAddIntern, PlanLimitError } from "@/lib/plan-limits";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { resolveOrgForPublicSignup } from "@/lib/default-org";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitAsync(ip, 5, 60000))) {
      return errorResponse("Too many requests", 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 400);
    }

    const { email, password, name, orgSlug } = parsed.data;

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    const existingIntern = await prisma.intern.findUnique({ where: { email } });
    if (existingAdmin || existingIntern) {
      return errorResponse("An account with this email already exists", 409);
    }

    const resolved = await resolveOrgForPublicSignup(orgSlug);
    if (!resolved.ok) {
      return errorResponse(resolved.error, resolved.status);
    }
    const orgId = resolved.orgId;

    const passwordHash = await hashPassword(password);

    await assertCanAddIntern(orgId);

    const intern = await prisma.intern.create({
      data: {
        orgId,
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
    const userId = intern.id;
    const role: "admin" | "intern" = "intern";

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
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.message, code: err.code, upgrade: true },
        { status: 402 }
      );
    }
    return serverError(err, "register");
  }
}
