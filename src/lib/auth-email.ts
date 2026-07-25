import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { agentmail, getHRInboxId } from "@/lib/agentmail";
import { escapeHtml } from "@/lib/html-escape";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hrms.intelliforge.tech")
  .trim()
  .replace(/<[^>]*>/g, "");

const TOKEN_EXPIRY_MINUTES = 15;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { hashToken };

async function storeToken(
  identifier: string,
  rawToken: string,
  type: "EMAIL_VERIFY" | "PASSWORD_RESET" | "MAGIC_LINK"
) {
  const hashed = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier, type },
  });

  await prisma.verificationToken.create({
    data: { identifier, token: hashed, type, expires },
  });
}

export async function sendMagicLinkEmail(email: string, name?: string) {
  const token = generateToken();
  await storeToken(email, token, "MAGIC_LINK");

  const link = `${APP_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}&type=magic`;
  const greeting = name ? `Hi ${escapeHtml(name)}` : "Hi";

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: email,
    subject: "Sign in to IntelliForge HRMS",
    html: `
      <h2>${greeting},</h2>
      <p>Click the link below to sign in to the IntelliForge HRMS portal:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Sign In to HRMS
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this email.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

export async function sendVerificationEmail(email: string, name: string) {
  const token = generateToken();
  await storeToken(email, token, "EMAIL_VERIFY");

  const link = `${APP_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}&type=verify`;

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: email,
    subject: "Verify your IntelliForge HRMS email",
    html: `
      <h2>Hi ${escapeHtml(name)},</h2>
      <p>Please verify your email address to complete registration:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Verify Email
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

const ADMIN_INVITE_EXPIRY_DAYS = 7;

export async function sendAdminInviteEmail(args: {
  to: string;
  rawToken: string;
  recipientName?: string | null;
  orgName: string;
  workspaceRole: string;
  isPromotion: boolean;
}) {
  const link = `${APP_URL}/accept-admin-invite?t=${encodeURIComponent(args.rawToken)}`;
  const greeting = args.recipientName?.trim()
    ? `Hi ${escapeHtml(args.recipientName.trim())}`
    : "Hi";
  const roleLabel =
    args.workspaceRole === "MENTOR" ? "mentor" : "full workspace admin";
  const lead = args.isPromotion
    ? `<p>You've been invited to continue with <strong>${escapeHtml(args.orgName)}</strong> as a <strong>${escapeHtml(roleLabel)}</strong> using your existing intern email.</p>`
    : `<p>You've been invited to join <strong>${escapeHtml(args.orgName)}</strong> on IntelliForge HRMS as a <strong>${escapeHtml(roleLabel)}</strong>.</p>`;

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: args.to,
    subject: args.isPromotion
      ? `Complete your move to team access — ${args.orgName}`
      : `You're invited to IntelliForge HRMS — ${args.orgName}`,
    html: `
      <h2>${greeting},</h2>
      ${lead}
      <p>Click the button below to choose your password and activate your account:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Accept invitation
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">This link expires in ${ADMIN_INVITE_EXPIRY_DAYS} days. If you didn't expect this, you can ignore this email.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

export async function sendAdminWelcomeEmail(args: {
  to: string;
  recipientName?: string | null;
  orgName: string;
  workspaceRole: string;
}) {
  const signInUrl = `${APP_URL}/sign-in`;
  const greeting = args.recipientName?.trim()
    ? `Hi ${escapeHtml(args.recipientName.trim())}`
    : "Hi";
  const roleLabel =
    args.workspaceRole === "MENTOR" ? "mentor" : "full workspace admin";

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: args.to,
    subject: `Your IntelliForge HRMS account — ${args.orgName}`,
    html: `
      <h2>${greeting},</h2>
      <p>Your workspace admin created a <strong>${escapeHtml(roleLabel)}</strong> account for you at <strong>${escapeHtml(args.orgName)}</strong>.</p>
      <p>Sign in with the email address this message was sent to and the password your admin shared with you.</p>
      <p><a href="${signInUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Sign in to HRMS
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">For security, change your password after your first sign-in from the sign-in page.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, name?: string) {
  const token = generateToken();
  await storeToken(email, token, "PASSWORD_RESET");

  const link = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const greeting = name ? `Hi ${escapeHtml(name)}` : "Hi";

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: email,
    subject: "Reset your IntelliForge HRMS password",
    html: `
      <h2>${greeting},</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Reset Password
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this email.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

/**
 * Sent when an org-admin approves a mentor application. The applicant's Admin
 * account already exists (with a throwaway password), so we issue a
 * PASSWORD_RESET token and point them at `/reset-password` to choose their own
 * password and activate their login. If the 15-minute link expires, they can
 * request a fresh one via "Forgot password" on the sign-in page.
 */
export async function sendMentorApprovalEmail(
  email: string,
  name: string,
  orgName: string
) {
  const token = generateToken();
  await storeToken(email, token, "PASSWORD_RESET");

  const link = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: email,
    subject: `You're approved as a mentor — ${orgName}`,
    html: `
      <h2>Congratulations, ${escapeHtml(name)}!</h2>
      <p>Your application to mentor with <strong>${escapeHtml(orgName)}</strong> on IntelliForge has been approved.</p>
      <p>Set your password to activate your mentor account and go live in the directory:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Set your password
      </a></p>
      <p style="color:#94a3b8;font-size:13px;">This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If it expires, go to <a href="${APP_URL}/sign-in">${APP_URL}/sign-in</a> and use "Forgot password" with this email address (${escapeHtml(email)}) to get a fresh link.</p>
      <br/><p>— IntelliForge AI</p>
    `,
  });
}

export async function consumeToken(
  email: string,
  rawToken: string,
  type: "EMAIL_VERIFY" | "PASSWORD_RESET" | "MAGIC_LINK"
) {
  const hashed = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token: hashed } },
  });

  if (!record || record.type !== type || record.expires < new Date()) {
    return null;
  }

  await prisma.verificationToken.delete({ where: { id: record.id } });
  return record;
}
