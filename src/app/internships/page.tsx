import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Clock, ArrowRight, Building2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { InternshipsSearch } from "./search";
import {
  LISTING_TYPE_LABELS,
  formatStipendLabel,
  listingTypeLabel,
} from "@/lib/hiring/listing-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Open Internships",
  description:
    "Browse open mentor-led internship cohorts from organizations running their programs on the Mentor Internship Platform. Apply in minutes.",
  alternates: { canonical: "/internships" },
  openGraph: { title: "Open Internships", url: "/internships" },
};

interface JobListing {
  id: string;
  slug: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  employmentType: string;
  duration: string | null;
  salaryInfo: string | null;
  org: { name: string; slug: string; logoUrl: string | null };
}

async function getJobs(): Promise<JobListing[]> {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        skills: true,
        location: true,
        employmentType: true,
        duration: true,
        salaryInfo: true,
        org: { select: { name: true, slug: true, logoUrl: true } },
      },
    });
    return jobs;
  } catch {
    return [];
  }
}

export default async function InternshipsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const allJobs = await getJobs();
  const activeType =
    searchParams?.type && searchParams.type in LISTING_TYPE_LABELS ? searchParams.type : null;
  const jobs = activeType ? allJobs.filter((j) => j.employmentType === activeType) : allJobs;
  const typeCounts = allJobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.employmentType] = (acc[j.employmentType] ?? 0) + 1;
    return acc;
  }, {});
  const typesPresent = Object.keys(LISTING_TYPE_LABELS).filter((t) => typeCounts[t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-emerald-600/5" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-400">
                Program openings
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Open internship{" "}
              <span className="gradient-text">cohorts</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              View active cohort openings from organizations running internal
              internship programs on IntelliForge. Apply in minutes.
            </p>

            <InternshipsSearch />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
          {typesPresent.length > 1 && (
            <nav aria-label="Filter by listing type" className="mb-6 flex flex-wrap gap-2">
              {[{ key: null as string | null, label: "All", count: allJobs.length }]
                .concat(
                  typesPresent.map((t) => ({ key: t, label: listingTypeLabel(t), count: typeCounts[t] })),
                )
                .map((opt) => {
                  const active = opt.key === activeType;
                  return (
                    <Link
                      key={opt.key ?? "all"}
                      href={opt.key ? `/internships?type=${opt.key}` : "/internships"}
                      aria-current={active ? "page" : undefined}
                      data-testid={`type-filter-${opt.key ?? "all"}`}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-200"
                          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {opt.label} ({opt.count})
                    </Link>
                  );
                })}
            </nav>
          )}
          {jobs.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                No open internships right now. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-2">
                {jobs.length} active{" "}
                {jobs.length === 1 ? "listing" : "listings"}
                {activeType ? ` · ${listingTypeLabel(activeType)}` : " across organizations"}
              </p>
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/internships/${job.slug}`}
                  className="glass-card p-6 block hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group internships-job-card"
                  data-type={job.employmentType}
                  data-title={job.title.toLowerCase()}
                  data-skills={job.skills.map((s) => s.toLowerCase()).join(",")}
                  data-org={job.org.name.toLowerCase()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {job.title}
                        </h2>
                        <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                          {listingTypeLabel(job.employmentType)}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {job.org.name}
                      </p>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.duration}
                          </span>
                        )}
                        {(() => {
                          const stipend = formatStipendLabel(job.salaryInfo, job.employmentType);
                          return (
                            <span
                              className={stipend.disclosed ? "text-emerald-400/80" : "text-slate-400"}
                              data-testid="listing-stipend"
                            >
                              {stipend.text}
                            </span>
                          );
                        })()}
                      </div>
                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills.slice(0, 6).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 6 && (
                            <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                              +{job.skills.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
