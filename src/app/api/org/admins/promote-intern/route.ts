import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";
import { isFullOrgAdminRole, ORG_ADMIN_ROLE, type OrgAdminRole } from "@/lib/org-admin-roles";
import { issueAdminInvite } from "@/lib/admin-invite-flow";

const promoteSchema = z.object({
  internId: z.string().min(1),
  role: z.enum([ORG_ADMIN_ROLE.ADMIN, ORG_ADMIN_ROLE.MENTOR]).default(ORG_ADMIN_ROLE.MENTOR),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json({ error: "Only organization admins can promote interns." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = promoteSchema.safeParse(body);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { internId, role } = parsed.data;
    const orgRole: OrgAdminRole = role;

    const intern = await prisma.intern.findFirst({
      where: { id: internId, orgId: admin.orgId, deactivated: false },
    });
    if (!intern) {
      return NextResponse.json({ error: "Active intern not found" }, { status: 404 });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email: intern.email } });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "An admin account already uses this email." },
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

    const { expiresAt } = await issueAdminInvite({
      orgId: admin.orgId,
      orgName: org.name,
      email: intern.email,
      name: intern.name,
      role: orgRole,
      internId: intern.id,
    });

    return NextResponse.json({
      invited: true,
      email: intern.email,
      role: orgRole,
      expiresAt: expiresAt.toISOString(),
      message:
        "Promotion invite sent. They will set their password from the email link; their intern login stays active until they accept.",
    });
  } catch (err) {
    return serverError(err, "Promote intern to admin");
  }
}
