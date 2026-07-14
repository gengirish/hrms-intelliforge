import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  extractMentorDraftFromLinkedIn,
  normalizeLinkedInProfileUrl,
} from "@/lib/ai/linkedin-mentor-import";
import {
  linkedInImportApplySchema,
  linkedInImportCreateSchema,
  linkedInImportPreviewSchema,
} from "@/lib/validations";
import {
  slugifyMentorName,
  ensureUniqueMentorSlug,
} from "@/lib/marketplace";
import { createOrgAdminDirect } from "@/lib/admin-invite-flow";
import {
  isFullOrgAdminRole,
  normalizeOrgAdminRole,
  ORG_ADMIN_ROLE,
} from "@/lib/org-admin-roles";
import { assertCanAddMentor, PlanLimitError } from "@/lib/plan-limits";

const actionSchema = z.object({
  action: z.enum(["preview", "apply-self", "create-mentor"]),
});

function canManageMentorProfile(role: string | null | undefined): boolean {
  const normalized = normalizeOrgAdminRole(role);
  return (
    normalized === ORG_ADMIN_ROLE.ADMIN ||
    normalized === ORG_ADMIN_ROLE.MENTOR
  );
}

async function upsertMentorProfileForAdmin(
  adminId: string,
  orgId: string,
  adminName: string,
  fields: {
    headline?: string | null;
    bio?: string | null;
    expertise?: string[];
    yearsExperience?: number | null;
    linkedinUrl: string;
    githubUrl?: string | null;
    avatarUrl?: string | null;
    isPublic?: boolean;
  }
) {
  const existing = await prisma.mentorProfile.findUnique({
    where: { adminId },
    select: { id: true },
  });

  const profileData = {
    headline: fields.headline ?? null,
    bio: fields.bio ?? null,
    expertise: fields.expertise ?? [],
    yearsExperience: fields.yearsExperience ?? null,
    linkedinUrl: fields.linkedinUrl,
    githubUrl: fields.githubUrl || null,
    avatarUrl: fields.avatarUrl || null,
    ...(fields.isPublic !== undefined
      ? { isPublic: fields.isPublic }
      : existing
        ? {}
        : { isPublic: true }),
  };

  if (existing) {
    return prisma.mentorProfile.update({
      where: { id: existing.id },
      data: profileData,
      include: {
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
  }

  const slug = await ensureUniqueMentorSlug(
    slugifyMentorName(adminName, adminId)
  );

  return prisma.mentorProfile.create({
    data: {
      adminId,
      orgId,
      slug,
      ...profileData,
    },
    include: {
      availability: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 15, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const actionParsed = actionSchema.safeParse(body);
    if (!actionParsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { action } = actionParsed.data;

    if (action === "preview") {
      if (!canManageMentorProfile(admin.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const previewParsed = linkedInImportPreviewSchema.safeParse(body);
      if (!previewParsed.success) {
        const msg =
          Object.values(previewParsed.error.flatten().fieldErrors).flat()[0] ||
          "Invalid input";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const result = await extractMentorDraftFromLinkedIn({
        linkedinUrl: previewParsed.data.linkedinUrl,
        profileText: previewParsed.data.profileText,
      });

      return NextResponse.json({
        draft: result.draft,
        source: result.source,
        warning: result.warning,
      });
    }

    if (action === "apply-self") {
      const applyParsed = linkedInImportApplySchema.safeParse(body);
      if (!applyParsed.success) {
        const msg =
          Object.values(applyParsed.error.flatten().fieldErrors).flat()[0] ||
          "Invalid input";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      const payload = applyParsed.data;

      if (!canManageMentorProfile(admin.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const linkedinUrl = normalizeLinkedInProfileUrl(payload.linkedinUrl);
      if (!linkedinUrl) {
        return NextResponse.json(
          { error: "Enter a valid LinkedIn profile URL (linkedin.com/in/username)." },
          { status: 400 }
        );
      }

      let fields = {
        headline: payload.headline,
        bio: payload.bio,
        expertise: payload.expertise,
        yearsExperience: payload.yearsExperience,
        linkedinUrl,
        githubUrl: payload.githubUrl,
        avatarUrl: payload.avatarUrl,
        isPublic: payload.isPublic,
      };

      const needsExtraction =
        !payload.headline &&
        !payload.bio &&
        (!payload.expertise || payload.expertise.length === 0);

      if (needsExtraction) {
        const extracted = await extractMentorDraftFromLinkedIn({
          linkedinUrl: payload.linkedinUrl,
          profileText: payload.profileText,
        });
        fields = {
          headline: extracted.draft.headline,
          bio: extracted.draft.bio,
          expertise: extracted.draft.expertise,
          yearsExperience: extracted.draft.yearsExperience,
          linkedinUrl,
          githubUrl: payload.githubUrl ?? extracted.draft.githubUrl,
          avatarUrl: payload.avatarUrl ?? extracted.draft.avatarUrl,
          isPublic: payload.isPublic,
        };
      }

      const profile = await upsertMentorProfileForAdmin(
        admin.id,
        admin.orgId,
        admin.name ?? admin.email.split("@")[0],
        fields
      );

      return NextResponse.json({ profile });
    }

    const createParsed = linkedInImportCreateSchema.safeParse(body);
    if (!createParsed.success) {
      const msg =
        Object.values(createParsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const payload = createParsed.data;

    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only organization admins can create mentors from LinkedIn." },
        { status: 403 }
      );
    }

    const linkedinUrl = normalizeLinkedInProfileUrl(payload.linkedinUrl);
    if (!linkedinUrl) {
      return NextResponse.json(
        { error: "Enter a valid LinkedIn profile URL (linkedin.com/in/username)." },
        { status: 400 }
      );
    }

    await assertCanAddMentor(admin.orgId);

    const org = await prisma.organization.findUnique({
      where: { id: admin.orgId },
      select: { name: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const extracted = await extractMentorDraftFromLinkedIn({
      linkedinUrl: payload.linkedinUrl,
      profileText: payload.profileText,
    });

    const displayName =
      payload.name?.trim() ||
      extracted.draft.name ||
      payload.email.split("@")[0];

    const adminResult = await createOrgAdminDirect({
      orgId: admin.orgId,
      orgName: org.name,
      email: payload.email.trim(),
      name: displayName,
      role: ORG_ADMIN_ROLE.MENTOR,
      password: payload.password,
      sendWelcomeEmail: payload.sendWelcomeEmail,
    });

    if (!adminResult.ok) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const profile = await upsertMentorProfileForAdmin(
      adminResult.adminId,
      admin.orgId,
      displayName,
      {
        headline: payload.headline ?? extracted.draft.headline,
        bio: payload.bio ?? extracted.draft.bio,
        expertise: payload.expertise ?? extracted.draft.expertise,
        yearsExperience:
          payload.yearsExperience ?? extracted.draft.yearsExperience,
        linkedinUrl,
        githubUrl: payload.githubUrl ?? extracted.draft.githubUrl,
        avatarUrl: payload.avatarUrl ?? extracted.draft.avatarUrl,
        isPublic: payload.isPublic ?? true,
      }
    );

    return NextResponse.json({
      created: true,
      adminId: adminResult.adminId,
      email: adminResult.email,
      welcomeEmailSent: adminResult.welcomeEmailSent,
      profile,
      warning: extracted.warning,
    });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.message, code: err.code, upgrade: true },
        { status: 402 }
      );
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return serverError(err, "LinkedIn mentor import");
  }
}
