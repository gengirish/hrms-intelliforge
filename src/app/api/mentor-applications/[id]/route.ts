import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isFullOrgAdminRole, ORG_ADMIN_ROLE } from "@/lib/org-admin-roles";
import { errorResponse, serverError } from "@/lib/api-utils";
import { mentorApplicationReviewSchema } from "@/lib/validations";
import { createOrgAdminDirect } from "@/lib/admin-invite-flow";
import { slugifyMentorName, ensureUniqueMentorSlug } from "@/lib/marketplace";
import { assertCanAddMentor, PlanLimitError } from "@/lib/plan-limits";
import { sendMentorApprovalEmail } from "@/lib/auth-email";
import { sendMentorApplicationDeclined } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

/**
 * Approve or reject a pending mentor application (full org-admins only).
 *
 * On approve: mint a MENTOR-role Admin (with a throwaway password), create the
 * public MentorProfile, mark the application APPROVED with resultingAdminId,
 * then email the applicant a set-password link to activate their login.
 * On reject: mark REJECTED and send a polite decline.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.sub || session.role !== "admin" || !session.orgId) {
      return errorResponse("Unauthorized", 401);
    }
    if (!isFullOrgAdminRole(session.adminOrgRole)) {
      return errorResponse("Only organization admins can review mentor applications.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = mentorApplicationReviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 400);
    }
    const { action, reviewNote } = parsed.data;

    const application = await prisma.mentorApplication.findUnique({ where: { id } });
    if (!application || application.orgId !== session.orgId) {
      return errorResponse("Application not found", 404);
    }
    if (application.status !== "PENDING") {
      return errorResponse("This application has already been reviewed.", 409);
    }

    if (action === "reject") {
      await prisma.mentorApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewNote: reviewNote || null,
          reviewedByAdminId: session.sub,
          reviewedAt: new Date(),
        },
      });
      sendMentorApplicationDeclined(application.email, application.name, reviewNote).catch(
        (err) => console.warn("Mentor decline email failed:", err)
      );
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // action === "approve"
    await assertCanAddMentor(session.orgId);

    const org = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { name: true },
    });
    if (!org) return errorResponse("Organization not found", 404);

    const adminResult = await createOrgAdminDirect({
      orgId: session.orgId,
      orgName: org.name,
      email: application.email,
      name: application.name,
      role: ORG_ADMIN_ROLE.MENTOR,
      // Throwaway — the applicant sets their real password via the approval email.
      password: randomBytes(24).toString("hex"),
      sendWelcomeEmail: false,
    });
    if (!adminResult.ok) {
      return errorResponse(adminResult.error, adminResult.status);
    }

    const slug = await ensureUniqueMentorSlug(
      slugifyMentorName(application.name, adminResult.adminId)
    );

    await prisma.mentorProfile.create({
      data: {
        adminId: adminResult.adminId,
        orgId: session.orgId,
        slug,
        headline: application.headline,
        bio: application.bio,
        expertise: application.expertise,
        yearsExperience: application.yearsExperience,
        linkedinUrl: application.linkedinUrl,
        githubUrl: application.githubUrl,
        avatarUrl: application.avatarUrl,
        hourlyRatePaise: application.hourlyRatePaise,
        isPublic: true,
      },
    });

    await prisma.mentorApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewNote: reviewNote || null,
        reviewedByAdminId: session.sub,
        reviewedAt: new Date(),
        resultingAdminId: adminResult.adminId,
      },
    });

    sendMentorApprovalEmail(application.email, application.name, org.name).catch((err) =>
      console.warn("Mentor approval email failed:", err)
    );

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      adminId: adminResult.adminId,
      mentorSlug: slug,
    });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.message, code: err.code, upgrade: true },
        { status: 402 }
      );
    }
    return serverError(err, "Mentor application review error");
  }
}
