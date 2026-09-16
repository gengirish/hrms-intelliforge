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

/**
 * Re-checks full org-admin (ADMIN, not MENTOR) status from the database.
 *
 * Middleware enforces the MENTOR split from the JWT's `adminOrgRole` claim, which
 * stays unchanged for the token's 7-day lifetime after a demotion or removal.
 * Handlers that move money or change org configuration call this so a stale
 * session cannot keep full-admin powers.
 */
export async function hasFullOrgAdminAccess(
  adminId: string | undefined,
  orgId: string | undefined
): Promise<boolean> {
  if (!adminId || !orgId) return false;
  const admin = await prisma.admin.findFirst({
    where: { id: adminId, orgId },
    select: { role: true },
  });
  return !!admin && normalizeOrgAdminRole(admin.role) === ORG_ADMIN_ROLE.ADMIN;
}

/** `Admin` row variant of `hasFullOrgAdminAccess` for handlers that already loaded it. */
export function isFullOrgAdmin(admin: Pick<Admin, "role" | "orgId"> | null): boolean {
  return !!admin?.orgId && normalizeOrgAdminRole(admin.role) === ORG_ADMIN_ROLE.ADMIN;
}
