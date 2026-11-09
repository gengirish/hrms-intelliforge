import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Server-side loaders for the public listing and mentor detail pages. Shared by
 * the pages (so content is in the initial HTML), generateMetadata, the sitemap
 * and the public JSON routes. `cache` dedupes the page + metadata calls.
 */

export const publicJobSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  skills: true,
  location: true,
  employmentType: true,
  duration: true,
  responsibilities: true,
  requirements: true,
  bonusSkills: true,
  perks: true,
  interviewSteps: true,
  applicationEmail: true,
  salaryInfo: true,
  interviewLink: true,
  formType: true,
  createdAt: true,
  org: { select: { name: true, slug: true, logoUrl: true } },
} satisfies Prisma.JobPostingSelect;

export const getPublicJob = cache(async (slug: string) => {
  return prisma.jobPosting.findUnique({
    where: { slug, isActive: true },
    select: publicJobSelect,
  });
});

/** Current slug for an active posting that used to live at `oldSlug` (D11). */
export async function findRenamedJobSlug(oldSlug: string): Promise<string | null> {
  const job = await prisma.jobPosting.findFirst({
    where: { previousSlugs: { has: oldSlug }, isActive: true },
    select: { slug: true },
  });
  return job?.slug ?? null;
}

export type PublicJob = NonNullable<Awaited<ReturnType<typeof getPublicJob>>>;

export const publicMentorSelect = {
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
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true, timezone: true },
  },
  ratings: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, rating: true, comment: true, createdAt: true },
  },
} satisfies Prisma.MentorProfileSelect;

export const getPublicMentor = cache(async (slug: string) => {
  const profile = await prisma.mentorProfile.findUnique({
    where: { slug, isPublic: true },
    select: publicMentorSelect,
  });
  if (!profile) return null;
  return {
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
});

export type PublicMentor = NonNullable<Awaited<ReturnType<typeof getPublicMentor>>>;

/** Trim to a meta-description length on a word boundary. */
export function metaDescription(text: string | null | undefined, max = 160): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
