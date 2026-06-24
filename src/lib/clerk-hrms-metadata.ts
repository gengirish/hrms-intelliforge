import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { normalizeOrgAdminRole, ORG_ADMIN_ROLE } from "@/lib/org-admin-roles";
import {
  HRMS_META_KEY,
  type HrmsPublicMetadata,
  readHrmsFromPublicMetadata,
} from "@/lib/hrms-clerk-public-metadata";

export type { HrmsPublicMetadata };
export { readHrmsFromPublicMetadata };

export async function pushHrmsMetadataToClerk(
  clerkUserId: string,
  hrms: HrmsPublicMetadata
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
  await client.users.updateUser(clerkUserId, {
    publicMetadata: {
      ...existing,
      [HRMS_META_KEY]: hrms,
    },
  });
}

async function primaryEmailForClerkUser(clerkUserId: string): Promise<string | null> {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  return (
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? null
  );
}

/**
 * Create organization + Clerk-linked admin for a new workspace signup.
 */
export async function createOrgForClerkUser(
  clerkUserId: string,
  params: { orgName: string; slug: string; adminName?: string }
): Promise<HrmsPublicMetadata> {
  const primaryEmail = await primaryEmailForClerkUser(clerkUserId);
  if (!primaryEmail) {
    throw new Error("CLERK_NO_EMAIL");
  }

  const emailLower = primaryEmail.toLowerCase();

  const existingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ clerkUserId }, { email: { equals: emailLower, mode: "insensitive" } }],
    },
    select: { id: true, orgId: true },
  });
  if (existingAdmin?.orgId) {
    throw new Error("ADMIN_EXISTS");
  }

  const existingSlug = await prisma.organization.findUnique({
    where: { slug: params.slug },
  });
  if (existingSlug) {
    throw new Error("SLUG_TAKEN");
  }

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: params.orgName, slug: params.slug },
    });

    const admin = await tx.admin.create({
      data: {
        email: emailLower,
        clerkUserId,
        passwordHash: null,
        name: params.adminName?.trim() || params.orgName,
        orgId: org.id,
        emailVerified: true,
        role: ORG_ADMIN_ROLE.ADMIN,
      },
    });

    return { org, admin };
  });

  const hrms: HrmsPublicMetadata = {
    userId: result.admin.id,
    role: "admin",
    email: result.admin.email,
    orgId: result.org.id,
    adminOrgRole: ORG_ADMIN_ROLE.ADMIN,
  };
  await pushHrmsMetadataToClerk(clerkUserId, hrms);
  return hrms;
}

/**
 * Link Clerk user to Prisma Admin or Intern (by `clerkUserId` or email), then push claims to Clerk.
 * Returns null if no matching HRMS row exists yet.
 */
export async function syncClerkUserToHrms(
  clerkUserId: string
): Promise<HrmsPublicMetadata | null> {
  const primaryEmail = await primaryEmailForClerkUser(clerkUserId);
  if (!primaryEmail) return null;

  const emailLower = primaryEmail.toLowerCase();

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [{ clerkUserId }, { email: { equals: emailLower, mode: "insensitive" } }],
    },
    select: { id: true, email: true, orgId: true, role: true, clerkUserId: true },
  });
  if (admin) {
    if (admin.clerkUserId !== clerkUserId) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { clerkUserId },
      });
    }
    const orgId = admin.orgId ?? undefined;
    const adminOrgRole = normalizeOrgAdminRole(admin.role);
    const hrms: HrmsPublicMetadata = {
      userId: admin.id,
      role: "admin",
      email: admin.email,
      orgId,
      adminOrgRole,
    };
    await pushHrmsMetadataToClerk(clerkUserId, hrms);
    return hrms;
  }

  const intern = await prisma.intern.findFirst({
    where: {
      OR: [{ clerkUserId }, { email: { equals: emailLower, mode: "insensitive" } }],
    },
    select: { id: true, email: true, orgId: true, clerkUserId: true },
  });
  if (intern) {
    if (intern.clerkUserId !== clerkUserId) {
      await prisma.intern.update({
        where: { id: intern.id },
        data: { clerkUserId },
      });
    }
    const hrms: HrmsPublicMetadata = {
      userId: intern.id,
      role: "intern",
      email: intern.email,
      orgId: intern.orgId,
    };
    await pushHrmsMetadataToClerk(clerkUserId, hrms);
    return hrms;
  }

  return null;
}
