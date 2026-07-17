import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { slugifyMentorName, ensureUniqueMentorSlug } from "@/lib/marketplace";
import { isFullOrgAdminRole } from "@/lib/org-admin-roles";

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  timezone: z.string().optional(),
});

const profileSchema = z.object({
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  expertise: z.array(z.string().min(1).max(80)).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  githubUrl: z.string().url().optional().nullable().or(z.literal("")),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  hourlyRatePaise: z.number().int().min(0).optional().nullable(),
  isPublic: z.boolean().optional(),
  availability: z.array(availabilitySlotSchema).max(28).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json({ error: "Forbidden. Only full admins can view other mentors' profiles." }, { status: 403 });
    }

    const { id } = await params;

    const targetAdmin = await prisma.admin.findUnique({
      where: { id, orgId: admin.orgId },
      select: { name: true, email: true },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Target admin not found in your organization." }, { status: 404 });
    }

    const profile = await prisma.mentorProfile.findUnique({
      where: { adminId: id },
      include: {
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    return NextResponse.json({ profile, admin: targetAdmin });
  } catch (err) {
    return serverError(err, "Mentor profile by adminId GET error");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json({ error: "Forbidden. Only full admins can edit other mentors' profiles." }, { status: 403 });
    }

    const { id } = await params;

    const targetAdmin = await prisma.admin.findUnique({
      where: { id, orgId: admin.orgId },
      select: { id: true, name: true, email: true, orgId: true },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Target admin not found in your organization." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.mentorProfile.findUnique({
      where: { adminId: targetAdmin.id },
      select: { id: true, slug: true },
    });

    const profileData = {
      headline: data.headline ?? null,
      bio: data.bio ?? null,
      expertise: data.expertise ?? [],
      yearsExperience: data.yearsExperience ?? null,
      linkedinUrl: data.linkedinUrl || null,
      githubUrl: data.githubUrl || null,
      avatarUrl: data.avatarUrl || null,
      hourlyRatePaise: data.hourlyRatePaise ?? null,
      isPublic: data.isPublic ?? true,
    };

    let profileId: string;

    if (existing) {
      await prisma.mentorProfile.update({
        where: { id: existing.id },
        data: profileData,
      });
      profileId = existing.id;
    } else {
      const baseSlug = slugifyMentorName(
        targetAdmin.name ?? targetAdmin.email.split("@")[0],
        targetAdmin.id
      );
      const slug = await ensureUniqueMentorSlug(baseSlug);
      const created = await prisma.mentorProfile.create({
        data: {
          adminId: targetAdmin.id,
          orgId: targetAdmin.orgId,
          slug,
          ...profileData,
        },
      });
      profileId = created.id;
    }

    if (data.availability !== undefined) {
      await prisma.mentorAvailability.deleteMany({
        where: { mentorProfileId: profileId },
      });
      if (data.availability.length > 0) {
        await prisma.mentorAvailability.createMany({
          data: data.availability.map((slot) => ({
            mentorProfileId: profileId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: slot.timezone ?? "Asia/Kolkata",
          })),
        });
      }
    }

    const profile = await prisma.mentorProfile.findUnique({
      where: { id: profileId },
      include: {
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    return NextResponse.json({ profile, admin: targetAdmin });
  } catch (err) {
    return serverError(err, "Mentor profile by adminId POST error");
  }
}
