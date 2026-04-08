"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

interface JobListing {
  id: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  employmentType: string;
  duration: string | null;
  salaryInfo: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  INTERNSHIP: "Internship",
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
};

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/careers")
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-emerald-600/5" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-400">
                We&apos;re Hiring
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Build the Future with{" "}
              <span className="gradient-text">IntelliForge AI</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              Join our team and work on production AI systems, multi-agent
              workflows, and full-stack SaaS products.
            </p>

            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by role or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {search
                  ? "No positions match your search."
                  : "No open positions right now. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-2">
                {filtered.length} open{" "}
                {filtered.length === 1 ? "position" : "positions"}
              </p>
              {filtered.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className="glass-card p-6 block hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {job.title}
                        </h2>
                        <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                          {TYPE_LABELS[job.employmentType] ??
                            job.employmentType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
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
                        {job.salaryInfo && (
                          <span className="text-emerald-400/80">
                            {job.salaryInfo}
                          </span>
                        )}
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
