import type { Admin, Intern } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ORG_ADMIN_ROLE, normalizeOrgAdminRole } from "@/lib/org-admin-roles";

export async function getInternForAdmin(
  admin: Admin,
  internId: string
): Promise<Intern | null> {
  if (!admin.orgId) return null;

  const intern = await prisma.intern.findUnique({ where: { id: internId } });
  if (!intern || intern.orgId !== admin.orgId) return null;

  const isMentor = normalizeOrgAdminRole(admin.role) === ORG_ADMIN_ROLE.MENTOR;
  if (isMentor && intern.mentorId !== admin.id) return null;

  return intern;
}
