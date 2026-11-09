import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findRenamedJobSlug, getPublicJob, metaDescription } from "@/lib/public-listings";
import { InternshipDetail, type JobDetail } from "./internship-detail";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getPublicJob(params.slug);
  if (!job) return { title: "Listing not found", robots: { index: false } };

  const title = `${job.title} at ${job.org.name}`;
  const description = metaDescription(job.description);
  const url = `/internships/${job.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function InternshipDetailPage({ params }: Props) {
  const job = await getPublicJob(params.slug);
  if (!job) {
    // Slug regenerated after a title change: keep the old link working (D11).
    const renamed = await findRenamedJobSlug(params.slug);
    if (renamed) permanentRedirect(`/internships/${renamed}`);
    notFound();
  }

  const initialJob: JobDetail = {
    ...job,
    requirements: job.requirements as JobDetail["requirements"],
    perks: job.perks as JobDetail["perks"],
    interviewSteps: job.interviewSteps as JobDetail["interviewSteps"],
    createdAt: job.createdAt.toISOString(),
  };

  return <InternshipDetail initialJob={initialJob} />;
}
