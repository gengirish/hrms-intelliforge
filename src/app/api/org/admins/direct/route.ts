import { NextRequest, NextResponse } from "next/server";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { directAdminSchema } from "@/lib/validations";
import { isFullOrgAdminRole, ORG_ADMIN_ROLE, type OrgAdminRole } from "@/lib/org-admin-roles";
import { createOrgAdminDirect } from "@/lib/admin-invite-flow";
import { assertCanAddMentor, PlanLimitError } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only organization admins can add team members directly." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = directAdminSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0] || "Invalid input";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { email, name, role, password, sendWelcomeEmail } = parsed.data;
    const orgRole: OrgAdminRole = role;

    const org = await prisma.organization.findUnique({
      where: { id: admin.orgId },
      select: { name: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (orgRole === ORG_ADMIN_ROLE.MENTOR) {
      await assertCanAddMentor(admin.orgId);
    }

    const result = await createOrgAdminDirect({
      orgId: admin.orgId,
      orgName: org.name,
      email: email.trim(),
      name: name?.trim() || null,
      role: orgRole,
      password,
      sendWelcomeEmail,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      created: true,
      adminId: result.adminId,
      email: result.email,
      role: orgRole,
      welcomeEmailSent: result.welcomeEmailSent,
      message: result.welcomeEmailSent
        ? "Team member added. Sign-in instructions were emailed."
        : "Team member added. Share their sign-in email and password directly.",
    });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.message, code: err.code, upgrade: true },
        { status: 402 }
      );
    }
    return serverError(err, "Create org admin directly");
  }
}
