import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const pageRaw = req.nextUrl.searchParams.get("page");
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const expertiseRaw = req.nextUrl.searchParams.get("expertise");

    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const limitUncapped = Number.parseInt(limitRaw ?? "12", 10);
    const limit = Math.min(
      50,
      Math.max(1, Number.isNaN(limitUncapped) ? 12 : limitUncapped)
    );

    const expertise = expertiseRaw?.trim();
    const where = {
      isPublic: true,
      ...(expertise
        ? {
            expertise: {
              has: expertise,
            },
          }
        : {}),
    };

    const [profiles, total] = await Promise.all([
      prisma.mentorProfile.findMany({
        where,
        orderBy: [
          { isPremium: "desc" },
          { avgRating: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          headline: true,
          bio: true,
          expertise: true,
          yearsExperience: true,
          avatarUrl: true,
          hourlyRatePaise: true,
          isPremium: true,
          avgRating: true,
          ratingCount: true,
          admin: {
            select: {
              name: true,
              org: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.mentorProfile.count({ where }),
    ]);

    const mentors = profiles.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.admin.name ?? "Mentor",
      headline: p.headline,
      bio: p.bio,
      expertise: p.expertise,
      yearsExperience: p.yearsExperience,
      avatarUrl: p.avatarUrl,
      hourlyRatePaise: p.hourlyRatePaise,
      isPremium: p.isPremium,
      avgRating: p.avgRating,
      ratingCount: p.ratingCount,
      orgName: p.admin.org.name,
      orgSlug: p.admin.org.slug,
    }));

    return NextResponse.json({
      mentors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Public mentors GET error:", err);
    return NextResponse.json({
      mentors: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    });
  }
}
