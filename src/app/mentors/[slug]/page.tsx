"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Crown,
  Loader2,
  Briefcase,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BookSessionForm } from "@/components/mentors/book-session-form";
import { AvailabilityDisplay } from "@/components/mentors/availability-display";

interface MentorRating {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface MentorDetail {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  avatarUrl: string | null;
  hourlyRatePaise: number | null;
  isPremium: boolean;
  avgRating: number;
  ratingCount: number;
  org: { name: string; slug: string; logoUrl: string | null };
  availability: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone: string;
  }>;
  ratings: MentorRating[];
}

function formatRate(paise: number | null): string | null {
  if (paise == null || paise <= 0) return null;
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN")}/hr`;
}

export default function MentorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadMentor = useCallback(async () => {
    try {
      const res = await fetch(`/api/mentors/${slug}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMentor(data.mentor);
    } catch {
      toast.error("Failed to load mentor profile");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadMentor();
  }, [loadMentor]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !mentor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Briefcase className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Mentor Not Found</h1>
            <p className="text-slate-400 mb-6">
              This mentor profile may be private or doesn&apos;t exist.
            </p>
            <Link
              href="/mentors"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Browse Mentors
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const rate = formatRate(mentor.hourlyRatePaise);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-amber-600/5" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
            <Breadcrumbs
              className="mb-6"
              items={[
                { label: "Home", href: "/" },
                { label: "Mentors", href: "/mentors" },
                { label: mentor.name },
              ]}
            />
            <Link
              href="/mentors"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              All Mentors
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              {mentor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mentor.avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover border-2 border-indigo-500/30 shrink-0"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center text-3xl font-bold text-indigo-300 shrink-0">
                  {mentor.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">{mentor.name}</h1>
                  {mentor.isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                      <Crown className="h-3 w-3" />
                      Premium
                    </span>
                  )}
                </div>

                {mentor.headline && (
                  <p className="text-lg text-indigo-300/90 mb-3">{mentor.headline}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-indigo-400" />
                    {mentor.org.name}
                  </span>
                  {mentor.yearsExperience != null && mentor.yearsExperience > 0 && (
                    <span>{mentor.yearsExperience}+ years experience</span>
                  )}
                  {mentor.ratingCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Star className="h-4 w-4 fill-amber-400" />
                      {mentor.avgRating.toFixed(1)} ({mentor.ratingCount} reviews)
                    </span>
                  )}
                  {rate && <span className="text-emerald-400">{rate}</span>}
                </div>

                <div className="flex flex-wrap gap-3">
                  {mentor.linkedinUrl && (
                    <a
                      href={mentor.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {mentor.githubUrl && (
                    <a
                      href={mentor.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          {mentor.bio && (
            <section className="mb-12">
              <SectionHeading>About</SectionHeading>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {mentor.bio}
              </p>
            </section>
          )}

          {mentor.expertise.length > 0 && (
            <section className="mb-12">
              <SectionHeading>Expertise</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mb-12">
            <SectionHeading>Availability</SectionHeading>
            <div className="glass-card p-5">
              <AvailabilityDisplay slots={mentor.availability} />
            </div>
          </section>

          {mentor.ratings.length > 0 && (
            <section className="mb-12">
              <SectionHeading>Reviews</SectionHeading>
              <div className="space-y-3">
                {mentor.ratings.map((r) => (
                  <div key={r.id} className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < r.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-slate-300 flex gap-2">
                        <MessageSquare className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="glass-card border-t-2 border-t-indigo-500 p-8">
            <BookSessionForm slug={mentor.slug} mentorName={mentor.name} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-5">
      {children}
      <span className="flex-1 h-px bg-slate-800" />
    </h2>
  );
}
