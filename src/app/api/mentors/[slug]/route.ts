import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const profile = await prisma.mentorProfile.findUnique({
      where: { slug, isPublic: true },
      select: {
        id: true,
        slug: true,
        headline: true,
        bio: true,
        expertise: true,
        yearsExperience: true,
        linkedinUrl: true,
        githubUrl: true,
        avatarUrl: true,
        hourlyRatePaise: true,
        isPremium: true,
        avgRating: true,
        ratingCount: true,
        createdAt: true,
        admin: {
          select: {
            name: true,
            org: { select: { name: true, slug: true, logoUrl: true } },
          },
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            timezone: true,
          },
        },
        ratings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const mentor = {
      id: profile.id,
      slug: profile.slug,
      name: profile.admin.name ?? "Mentor",
      headline: profile.headline,
      bio: profile.bio,
      expertise: profile.expertise,
      yearsExperience: profile.yearsExperience,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      avatarUrl: profile.avatarUrl,
      hourlyRatePaise: profile.hourlyRatePaise,
      isPremium: profile.isPremium,
      avgRating: profile.avgRating,
      ratingCount: profile.ratingCount,
      createdAt: profile.createdAt,
      org: profile.admin.org,
      availability: profile.availability,
      ratings: profile.ratings,
    };

    return NextResponse.json({ mentor });
  } catch (err) {
    return serverError(err, "Public mentor detail GET error");
  }
}
