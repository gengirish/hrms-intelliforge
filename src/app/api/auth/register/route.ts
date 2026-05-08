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

    const { email, password, name } = parsed.data;

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    const existingIntern = await prisma.intern.findUnique({ where: { email } });
    if (existingAdmin || existingIntern) {
      return errorResponse("An account with this email already exists", 409);
    }

    // Multi-tenant safety: every Intern must belong to an Organization so that
    // org-scoped queries (e.g. /api/dashboard) can find them. Today the system
    // is single-tenant, so we attach new self-signups to the only org. Fail
    // loudly otherwise — better than silently creating orphan rows.
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    if (orgs.length === 0) {
      return errorResponse(
        "No organization configured. Contact support before creating an account.",
        503
      );
    }
    if (orgs.length > 1) {
      return errorResponse(
        "Multi-tenant self-signup is not supported. Use the org-specific invite flow.",
        500
      );
    }
    const orgId = orgs[0].id;

    const passwordHash = await hashPassword(password);

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
    return serverError(err, "register");
  }
}
