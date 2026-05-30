import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";
import { isFullOrgAdminRole, normalizeOrgAdminRole, ORG_ADMIN_ROLE, type OrgAdminRole } from "@/lib/org-admin-roles";

const patchSchema = z.object({
  role: z.enum([ORG_ADMIN_ROLE.ADMIN, ORG_ADMIN_ROLE.MENTOR]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetId } = await ctx.params;

    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json({ error: "Only organization admins can change roles." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const newRole: OrgAdminRole = parsed.data.role;

    const target = await prisma.admin.findFirst({
      where: { id: targetId, orgId: admin.orgId },
    });
    if (!target) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const current = normalizeOrgAdminRole(target.role);
    if (current === ORG_ADMIN_ROLE.ADMIN && newRole === ORG_ADMIN_ROLE.MENTOR) {
      const others = await prisma.admin.findMany({
        where: { orgId: admin.orgId, id: { not: targetId } },
        select: { role: true },
      });
      const otherFull = others.filter((o) => isFullOrgAdminRole(o.role)).length;
      if (otherFull === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last full admin. Promote another admin first." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.admin.update({
      where: { id: targetId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({
      admin: { ...updated, role: normalizeOrgAdminRole(updated.role) },
    });
  } catch (err) {
    return serverError(err, "Patch org admin");
  }
}
