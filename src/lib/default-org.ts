import { prisma } from "@/lib/prisma";

/**
 * Org resolution for **public, unauthenticated** signup-style endpoints
 * (`/api/auth/register`, `/api/mentors/apply`) where the submitter may not have
 * arrived through an org-scoped link and therefore sends no `orgSlug`.
 *
 * Order:
 *  1. explicit `orgSlug` from the request — always wins.
 *  2. `DEFAULT_ORG_SLUG` env var — the tenant that owns the public marketing
 *     pages. Set this once a second Organization row exists, otherwise every
 *     no-slug submission is refused.
 *  3. exactly one Organization in the DB — the legacy single-tenant path.
 *  4. otherwise: refuse, rather than guess and drop the person into the wrong
 *     tenant (see docs/MULTI_TENANT.md).
 */
export type DefaultOrgResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string; status: 400 | 404 | 503 };

export async function resolveOrgForPublicSignup(
  orgSlug?: string
): Promise<DefaultOrgResult> {
  if (orgSlug) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) return { ok: false, error: "Organization not found", status: 404 };
    return { ok: true, orgId: org.id };
  }

  const defaultSlug = process.env.DEFAULT_ORG_SLUG?.trim();
  if (defaultSlug) {
    const org = await prisma.organization.findUnique({
      where: { slug: defaultSlug },
      select: { id: true },
    });
    if (org) return { ok: true, orgId: org.id };
    // Misconfiguration, not a bad request — fall through to the org count so a
    // single-tenant deployment with a stale env var still works.
    console.error(
      `DEFAULT_ORG_SLUG="${defaultSlug}" does not match any organization`
    );
  }

  const orgs = await prisma.organization.findMany({ select: { id: true } });
  if (orgs.length === 0) {
    return {
      ok: false,
      error: "No organization is configured yet. Please contact support.",
      status: 503,
    };
  }
  if (orgs.length > 1) {
    return {
      ok: false,
      error:
        "We couldn't tell which organization this is for. Please use the link your organization sent you.",
      status: 400,
    };
  }
  return { ok: true, orgId: orgs[0].id };
}
