import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { hashToken, sendAdminInviteEmail, sendAdminWelcomeEmail } from "@/lib/auth-email";
import { normalizeOrgAdminRole, ORG_ADMIN_ROLE, type OrgAdminRole } from "@/lib/org-admin-roles";

export const ADMIN_INVITE_EXPIRY_DAYS = 7;

export function archivedInternEmail(internId: string) {
  return `archived+${internId}@interns.internal`;
}

export async function issueAdminInvite(params: {
  orgId: string;
  orgName: string;
  email: string;
  name?: string | null;
  role: OrgAdminRole;
  internId?: string | null;
}): Promise<{ expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + ADMIN_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.adminInvite.deleteMany({
    where: { orgId: params.orgId, email: params.email },
  });

  await prisma.adminInvite.create({
    data: {
      orgId: params.orgId,
      email: params.email,
      name: params.name ?? null,
      role: params.role,
      internId: params.internId ?? null,
      tokenHash,
      expiresAt,
    },
  });

  await sendAdminInviteEmail({
    to: params.email,
    rawToken,
    recipientName: params.name,
    orgName: params.orgName,
    workspaceRole: params.role,
    isPromotion: !!params.internId,
  });

  return { expiresAt };
}

export type AcceptInviteResult =
  | { ok: true; adminId: string; email: string }
  | { ok: false; error: string; status: number };

export type CreateAdminDirectResult =
  | { ok: true; adminId: string; email: string; welcomeEmailSent: boolean }
  | { ok: false; error: string; status: number };

export async function createOrgAdminDirect(params: {
  orgId: string;
  orgName: string;
  email: string;
  name?: string | null;
  role: OrgAdminRole;
  password: string;
  sendWelcomeEmail?: boolean;
}): Promise<CreateAdminDirectResult> {
  if (params.password.length < 8 || params.password.length > 128) {
    return {
      ok: false,
      error: "Password must be between 8 and 128 characters.",
      status: 400,
    };
  }

  const orgRole = normalizeOrgAdminRole(params.role);
  if (orgRole !== ORG_ADMIN_ROLE.ADMIN && orgRole !== ORG_ADMIN_ROLE.MENTOR) {
    return { ok: false, error: "Invalid workspace role.", status: 400 };
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: params.email },
  });
  if (existingAdmin) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const internClash = await prisma.intern.findUnique({
    where: { email: params.email },
  });
  if (internClash) {
    return {
      ok: false,
      error:
        "This email is registered as an intern. Promote them from Settings → Team instead of creating a duplicate account.",
      status: 409,
    };
  }

  const passwordHash = await hashPassword(params.password);
  const displayName = params.name?.trim() || params.email.split("@")[0];

  const admin = await prisma.$transaction(async (tx) => {
    await tx.adminInvite.deleteMany({
      where: { orgId: params.orgId, email: params.email },
    });

    return tx.admin.create({
      data: {
        orgId: params.orgId,
        email: params.email,
        passwordHash,
        name: displayName,
        role: orgRole,
        emailVerified: true,
      },
      select: { id: true, email: true },
    });
  });

  let welcomeEmailSent = false;
  if (params.sendWelcomeEmail !== false) {
    try {
      await sendAdminWelcomeEmail({
        to: params.email,
        recipientName: displayName,
        orgName: params.orgName,
        workspaceRole: orgRole,
      });
      welcomeEmailSent = true;
    } catch (e) {
      console.error("sendAdminWelcomeEmail:", e);
    }
  }

  return {
    ok: true,
    adminId: admin.id,
    email: admin.email,
    welcomeEmailSent,
  };
}

export async function acceptAdminInvite(
  rawToken: string,
  password: string
): Promise<AcceptInviteResult> {
  const trimmed = rawToken?.trim();
  if (!trimmed || trimmed.length < 16) {
    return { ok: false, error: "Invalid or missing invite link.", status: 400 };
  }
  if (password.length < 8 || password.length > 128) {
    return {
      ok: false,
      error: "Password must be between 8 and 128 characters.",
      status: 400,
    };
  }

  const tokenHash = hashToken(trimmed);
  const invite = await prisma.adminInvite.findUnique({
    where: { tokenHash },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return {
      ok: false,
      error: "This invite link is invalid or has expired. Ask your admin to send a new invite.",
      status: 400,
    };
  }

  const orgRole = normalizeOrgAdminRole(invite.role);
  if (orgRole !== ORG_ADMIN_ROLE.ADMIN && orgRole !== ORG_ADMIN_ROLE.MENTOR) {
    return { ok: false, error: "Invalid invitation.", status: 400 };
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: invite.email },
  });
  if (existingAdmin) {
    await prisma.adminInvite.delete({ where: { id: invite.id } }).catch(() => {});
    return {
      ok: false,
      error: "An account with this email already exists. You can sign in instead.",
      status: 409,
    };
  }

  try {
    if (invite.internId) {
      const result = await prisma.$transaction(async (tx) => {
        const intern = await tx.intern.findFirst({
          where: { id: invite.internId!, orgId: invite.orgId },
        });
        if (!intern || intern.deactivated) {
          throw new Error("INTERN_INVALID");
        }

        const signupEmail = intern.email;

        await tx.intern.update({
          where: { id: intern.id },
          data: {
            email: archivedInternEmail(intern.id),
            deactivated: true,
            deactivatedAt: new Date(),
            passwordHash: null,
            mentorId: null,
          },
        });

        const passwordHash = await hashPassword(password);
        const admin = await tx.admin.create({
          data: {
            orgId: invite.orgId,
            email: signupEmail,
            passwordHash,
            name: invite.name ?? intern.name,
            role: orgRole,
            emailVerified: intern.emailVerified,
          },
          select: { id: true, email: true },
        });

        await tx.adminInvite.delete({ where: { id: invite.id } });
        return admin;
      });

      return { ok: true, adminId: result.id, email: result.email };
    }

    const result = await prisma.$transaction(async (tx) => {
      const internClash = await tx.intern.findUnique({
        where: { email: invite.email },
      });
      if (internClash) {
        throw new Error("INTERN_CLASH");
      }

      const passwordHash = await hashPassword(password);
      const admin = await tx.admin.create({
        data: {
          orgId: invite.orgId,
          email: invite.email,
          passwordHash,
          name: invite.name ?? invite.email.split("@")[0],
          role: orgRole,
          emailVerified: false,
        },
        select: { id: true, email: true },
      });

      await tx.adminInvite.delete({ where: { id: invite.id } });
      return admin;
    });

    return { ok: true, adminId: result.id, email: result.email };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INTERN_INVALID") {
      return {
        ok: false,
        error:
          "This invitation no longer matches an active intern. Ask your admin to send a new invite.",
        status: 400,
      };
    }
    if (msg === "INTERN_CLASH") {
      return {
        ok: false,
        error: "This invitation is no longer valid. Ask your admin to send a new invite.",
        status: 409,
      };
    }
    console.error("acceptAdminInvite:", e);
    return { ok: false, error: "Could not complete signup. Try again.", status: 500 };
  }
}
