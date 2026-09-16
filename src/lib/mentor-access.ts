/**
 * MENTOR (limited org-admin) access rules, enforced centrally by `src/middleware.ts`.
 *
 * Kept free of Prisma / Node-only imports so it runs in the Edge middleware and
 * stays unit-testable. Route handlers that touch money or org configuration
 * additionally re-check the role from the database (`hasFullOrgAdminAccess`),
 * because the JWT claim this is evaluated against can be up to 7 days stale.
 */

/** Dashboard pages a MENTOR is redirected away from. */
const MENTOR_BLOCKED_PAGE_PREFIXES = [
  "/dashboard/settings",
  "/dashboard/hiring",
  "/dashboard/mentor-applications",
  "/dashboard/payouts",
  "/dashboard/marketplace",
];

/** API prefixes a MENTOR may not call with any method. */
const MENTOR_BLOCKED_API_PREFIXES = ["/api/billing", "/api/jobs", "/api/payouts"];

/** Intern bank / UPI details used for stipend disbursement. */
const INTERN_PAYOUT_PROFILE_RE = /^\/api\/dashboard\/intern\/[^/]+\/payout-profile\/?$/;

export function isMentorBlockedPage(pathname: string): boolean {
  return MENTOR_BLOCKED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isMentorBlockedApi(pathname: string, method: string): boolean {
  const m = method.toUpperCase();

  if (MENTOR_BLOCKED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (INTERN_PAYOUT_PROFILE_RE.test(pathname)) return true;
  if (pathname === "/api/org" && m === "PUT") return true;

  const teamMemberPatch =
    m === "PATCH" && /^\/api\/org\/admins\/(?!promote-intern)[^/]+\/?$/.test(pathname);

  return (
    (pathname === "/api/org/admins" && m === "POST") ||
    (pathname === "/api/org/admins/direct" && m === "POST") ||
    teamMemberPatch ||
    (pathname === "/api/org/admins/promote-intern" && m === "POST")
  );
}
