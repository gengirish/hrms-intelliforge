import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse, serverError } from "@/lib/api-utils";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth";
import { mentorApplicationSchema } from "@/lib/validations";
import { resolveOrgForPublicSignup } from "@/lib/default-org";
import {
  sendMentorApplicationReceived,
  sendNewMentorApplicationAlert,
} from "@/lib/agentmail";

export const dynamic = "force-dynamic";

/**
 * Public "Apply as a mentor" submission. No auth. Writes a PENDING
 * MentorApplication and fires (unawaited) applicant + admin emails. The Admin
 * login and MentorProfile are only created later, on approval.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitAsync(getClientIp(req), 5, 60_000))) {
      return errorResponse("Too many requests. Please try again in a minute.", 429);
    }

    const body = await req.json();
    const parsed = mentorApplicationSchema.safeParse(body);
    if (!parsed.success) {
      const msg =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid input";
      return errorResponse(msg, 400);
    }
    const data = parsed.data;

    // Resolve the org this application belongs to: explicit orgSlug, else the
    // DEFAULT_ORG_SLUG tenant that owns the public /mentors pages, else the
    // sole org. The public apply link carries no ?org= param, so without the
    // default every submission would be refused once a second org exists.
    const resolved = await resolveOrgForPublicSignup(data.orgSlug);
    if (!resolved.ok) return errorResponse(resolved.error, resolved.status);
    const orgId = resolved.orgId;

    // Reject duplicates: an already-registered admin, or a pending application.
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existingAdmin) {
      return errorResponse(
        "An account with this email already exists. Please sign in instead.",
        409
      );
    }

    const existingPending = await prisma.mentorApplication.findFirst({
      where: { orgId, email: data.email, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) {
      return errorResponse(
        "You already have a mentor application under review. We'll be in touch soon.",
        409
      );
    }

    // passwordHash is NOT NULL in the schema but the applicant sets their real
    // password on approval — store a throwaway hash to satisfy the constraint.
    const passwordHash = await hashPassword(randomBytes(24).toString("hex"));

    const application = await prisma.mentorApplication.create({
      data: {
        orgId,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        headline: data.headline || null,
        bio: data.bio || null,
        expertise: data.expertise ?? [],
        yearsExperience: data.yearsExperience ?? null,
        linkedinUrl: data.linkedinUrl || null,
        githubUrl: data.githubUrl || null,
        portfolioUrl: data.portfolioUrl || null,
        passwordHash,
        status: "PENDING",
      },
      select: { id: true },
    });

    sendMentorApplicationReceived(data.email, data.name).catch((err) =>
      console.warn("Mentor application confirmation email failed:", err)
    );
    sendNewMentorApplicationAlert({
      applicantName: data.name,
      applicantEmail: data.email,
      applicantPhone: data.phone,
      headline: data.headline,
      expertise: data.expertise,
      linkedinUrl: data.linkedinUrl,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
    }).catch((err) =>
      console.warn("Mentor application alert email failed:", err)
    );

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (err) {
    return serverError(err, "Mentor apply POST error");
  }
}
