import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMentor, metaDescription } from "@/lib/public-listings";
import { dedupeBioAgainstHeadline, isMentorProfileComplete } from "@/lib/mentor-listing";
import { normaliseTags } from "@/lib/tag-normalise";
import { MentorDetailView, type MentorDetail } from "./mentor-detail";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mentor = await getPublicMentor(params.slug);
  if (!mentor) return { title: "Mentor not found", robots: { index: false } };

  const title = mentor.headline ? `${mentor.name} — ${mentor.headline}` : mentor.name;
  const description = metaDescription(mentor.bio ?? mentor.headline);
  const url = `/mentors/${mentor.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Incomplete profiles stay reachable by link but are kept out of search (D5).
    ...(isMentorProfileComplete(mentor) ? {} : { robots: { index: false } }),
    openGraph: { title, description, url, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function MentorDetailPage({ params }: Props) {
  const mentor = await getPublicMentor(params.slug);
  if (!mentor) notFound();

  const initialMentor: MentorDetail = {
    ...mentor,
    bio: dedupeBioAgainstHeadline(mentor.headline, mentor.bio),
    expertise: normaliseTags(mentor.expertise),
    ratings: mentor.ratings.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };

  return <MentorDetailView initialMentor={initialMentor} />;
}
