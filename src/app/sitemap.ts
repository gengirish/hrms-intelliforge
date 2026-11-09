import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicMentorWhere } from "@/lib/mentor-listing";

const BASE_URL = "https://hrms.intelliforge.tech";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC_ROUTES = ["/", "/pricing", "/about", "/internships", "/mentors", "/mentors/apply", "/create-org"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
  }));

  try {
    const [jobs, mentors] = await Promise.all([
      prisma.jobPosting.findMany({
        where: { isActive: true },
        select: { slug: true, createdAt: true },
      }),
      prisma.mentorProfile.findMany({
        where: publicMentorWhere(),
        select: { slug: true, updatedAt: true },
      }),
    ]);
    for (const job of jobs) {
      entries.push({ url: `${BASE_URL}/internships/${job.slug}`, lastModified: job.createdAt });
    }
    for (const mentor of mentors) {
      entries.push({ url: `${BASE_URL}/mentors/${mentor.slug}`, lastModified: mentor.updatedAt });
    }
  } catch (err) {
    // A DB hiccup should still serve the static part of the sitemap.
    console.error("sitemap: failed to load dynamic routes", err);
  }

  return entries;
}
