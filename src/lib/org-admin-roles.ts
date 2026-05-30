/** Values stored on `Admin.role` (Prisma). */
export const ORG_ADMIN_ROLE = {
  ADMIN: "ADMIN",
  MENTOR: "MENTOR",
} as const;

export type OrgAdminRole = (typeof ORG_ADMIN_ROLE)[keyof typeof ORG_ADMIN_ROLE];

export function normalizeOrgAdminRole(role: string | null | undefined): OrgAdminRole {
  const u = (role ?? ORG_ADMIN_ROLE.ADMIN).toUpperCase();
  if (u === ORG_ADMIN_ROLE.MENTOR) return ORG_ADMIN_ROLE.MENTOR;
  return ORG_ADMIN_ROLE.ADMIN;
}

export function isFullOrgAdminRole(role: string | null | undefined): boolean {
  return normalizeOrgAdminRole(role) === ORG_ADMIN_ROLE.ADMIN;
}
