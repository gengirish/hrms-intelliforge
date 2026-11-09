import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMentor, metaDescription } from "@/lib/public-listings";
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
    openGraph: { title, description, url, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function MentorDetailPage({ params }: Props) {
  const mentor = await getPublicMentor(params.slug);
  if (!mentor) notFound();

  const initialMentor: MentorDetail = {
    ...mentor,
    ratings: mentor.ratings.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };

  return <MentorDetailView initialMentor={initialMentor} />;
}
