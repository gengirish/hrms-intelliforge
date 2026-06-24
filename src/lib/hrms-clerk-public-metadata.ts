/** Stored on Clerk `publicMetadata` for Edge middleware (no Prisma there). */
export type HrmsPublicMetadata = {
  userId: string;
  role: "admin" | "intern";
  email: string;
  orgId?: string;
  adminOrgRole?: string;
};

const HRMS_META_KEY = "hrms" as const;

export function readHrmsFromPublicMetadata(
  publicMetadata: Record<string, unknown> | null | undefined
): HrmsPublicMetadata | null {
  const raw = publicMetadata?.[HRMS_META_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.userId !== "string" ||
    (o.role !== "admin" && o.role !== "intern") ||
    typeof o.email !== "string"
  ) {
    return null;
  }
  return {
    userId: o.userId,
    role: o.role,
    email: o.email,
    orgId: typeof o.orgId === "string" ? o.orgId : undefined,
    adminOrgRole: typeof o.adminOrgRole === "string" ? o.adminOrgRole : undefined,
  };
}

export { HRMS_META_KEY };
