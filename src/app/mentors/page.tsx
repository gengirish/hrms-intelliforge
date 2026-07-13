import { Suspense } from "react";
import { Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { MentorDirectory } from "@/components/mentors/mentor-directory";
import type { MentorListing } from "@/components/mentors/mentor-card";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

async function getMentors(page: number, expertise?: string) {
  const empty = {
    mentors: [] as MentorListing[],
    total: 0,
    page,
    limit: PAGE_SIZE,
    totalPages: 0,
  };

  try {
    const where = {
      isPublic: true,
      ...(expertise ? { expertise: { has: expertise } } : {}),
    };

    const [profiles, total] = await Promise.all([
      prisma.mentorProfile.findMany({
        where,
        orderBy: [
          { isPremium: "desc" },
          { avgRating: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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
              org: { select: { name: true } },
            },
          },
        },
      }),
      prisma.mentorProfile.count({ where }),
    ]);

    const mentors: MentorListing[] = profiles.map((p) => ({
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
    }));

    return {
      mentors,
      total,
      page,
      limit: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  } catch {
    return empty;
  }
}

async function getExpertiseOptions(): Promise<string[]> {
  try {
    const profiles = await prisma.mentorProfile.findMany({
      where: { isPublic: true },
      select: { expertise: true },
    });
    const set = new Set<string>();
    for (const p of profiles) {
      for (const e of p.expertise) set.add(e);
    }
    return Array.from(set).sort();
  } catch {
    return [];
  }
}

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; expertise?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const expertise = params.expertise?.trim();

  const [initialData, expertiseOptions] = await Promise.all([
    getMentors(page, expertise),
    getExpertiseOptions(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-amber-600/5" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-6">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">
                Mentor Marketplace
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Find Your{" "}
              <span className="gradient-text">Perfect Mentor</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              Browse verified mentors by skill, industry, and availability.
              Book 1:1 sessions to accelerate your career.
            </p>
          </div>
        </section>

        <Suspense
          fallback={
            <div className="text-center py-16 text-slate-500">Loading mentors…</div>
          }
        >
          <MentorDirectory
            initialData={initialData}
            expertiseOptions={expertiseOptions}
          />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
