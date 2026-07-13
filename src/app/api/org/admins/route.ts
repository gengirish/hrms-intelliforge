import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";
import { isFullOrgAdminRole, normalizeOrgAdminRole, ORG_ADMIN_ROLE, type OrgAdminRole } from "@/lib/org-admin-roles";
import { issueAdminInvite } from "@/lib/admin-invite-flow";
import { assertCanAddMentor, PlanLimitError } from "@/lib/plan-limits";

const inviteAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum([ORG_ADMIN_ROLE.ADMIN, ORG_ADMIN_ROLE.MENTOR]).default(ORG_ADMIN_ROLE.MENTOR),
});

export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admins = await prisma.admin.findMany({
      where: { orgId: admin.orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        _count: { select: { mentees: true } },
      },
      orderBy: { email: "asc" },
    });

    return NextResponse.json({
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: normalizeOrgAdminRole(a.role),
        emailVerified: a.emailVerified,
        menteeCount: a._count.mentees,
      })),
    });
  } catch (err) {
    return serverError(err, "List org admins");
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json({ error: "Only organization admins can invite team members." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteAdminSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0] || "Invalid input";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { email, name, role } = parsed.data;
    const orgRole: OrgAdminRole = role;

    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const internClash = await prisma.intern.findUnique({ where: { email } });
    if (internClash) {
      return NextResponse.json(
        {
          error:
            "This email is registered as an intern. Promote them from Settings → Team instead of inviting again.",
        },
        { status: 409 }
      );
    }

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

    const { expiresAt } = await issueAdminInvite({
      orgId: admin.orgId,
      orgName: org.name,
      email,
      name: name ?? null,
      role: orgRole,
    });

    return NextResponse.json({
      invited: true,
      email,
      role: orgRole,
      expiresAt: expiresAt.toISOString(),
      message: "Invite email sent. They will set their own password from the link.",
    });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.message, code: err.code, upgrade: true },
        { status: 402 }
      );
    }
    return serverError(err, "Create org admin");
  }
}
