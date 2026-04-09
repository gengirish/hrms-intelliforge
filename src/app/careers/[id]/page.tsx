"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Briefcase,
  Loader2,
  CheckCircle2,
  Send,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

interface Requirement {
  title: string;
  description: string;
}

interface Perk {
  icon: string;
  title: string;
  description: string;
}

interface InterviewStep {
  step: string;
  title: string;
  description: string;
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  employmentType: string;
  duration: string | null;
  responsibilities: string[];
  requirements: Requirement[] | null;
  bonusSkills: string[];
  perks: Perk[] | null;
  interviewSteps: InterviewStep[] | null;
  applicationEmail: string | null;
  salaryInfo: string | null;
  interviewLink: string | null;
  createdAt: string;
  org: { name: string; logoUrl: string | null };
}

const TYPE_LABELS: Record<string, string> = {
  INTERNSHIP: "Internship",
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
};

export default function CareerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    resumeUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    coverNote: "",
  });

  const loadJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/careers/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJob(data.job);
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      let resumeUrl = form.resumeUrl;

      if (resumeFile && !resumeUrl) {
        setUploadingResume(true);
        const fd = new FormData();
        fd.append("resume", resumeFile);
        const uploadRes = await fetch("/api/careers/upload-resume", {
          method: "POST",
          body: fd,
        });
        setUploadingResume(false);
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          toast.error(err.error || "Resume upload failed");
          setSubmitting(false);
          return;
        }
        const uploadData = await uploadRes.json();
        resumeUrl = uploadData.url;
      }

      const res = await fetch(`/api/careers/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, resumeUrl }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.info(data.error || "You have already applied");
        setSubmitted(true);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Application failed");
        return;
      }

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch {
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Briefcase className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Position Not Found
            </h1>
            <p className="text-slate-400 mb-6">
              This job posting may have been closed or doesn&apos;t exist.
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              View All Positions
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-emerald-600/5" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              All Positions
            </Link>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Now Hiring
              </span>
              <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400">
                {TYPE_LABELS[job.employmentType] ?? job.employmentType}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              {job.title}
            </h1>
            <p className="text-base text-slate-400 max-w-2xl mb-6">
              {job.description}
            </p>

            <div className="flex flex-wrap gap-5 text-sm text-slate-400">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  {job.location}
                </span>
              )}
              {job.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  {job.duration}
                </span>
              )}
              {job.salaryInfo && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-indigo-400" />
                  {job.salaryInfo}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-indigo-400" />
                {job.org.name}
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Skills */}
          {job.skills.length > 0 && (
            <section className="mb-12">
              <SectionHeading>Tech Stack</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
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

          {/* Responsibilities */}
          {job.responsibilities.length > 0 && (
            <section className="mb-12">
              <SectionHeading>The Role</SectionHeading>
              <div className="space-y-3">
                {job.responsibilities.map((item, i) => (
                  <div
                    key={i}
                    className="glass-card p-4 flex gap-4 items-start hover:border-indigo-500/30 transition-colors"
                  >
                    <span className="text-xs font-mono text-indigo-400 mt-0.5 shrink-0 w-6 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Requirements */}
          {job.requirements && (job.requirements as Requirement[]).length > 0 && (
            <section className="mb-12">
              <SectionHeading>What We&apos;re Looking For</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(job.requirements as Requirement[]).map((req, i) => (
                  <div key={i} className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-1.5">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {req.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bonus Skills */}
          {job.bonusSkills.length > 0 && (
            <section className="mb-12">
              <SectionHeading>Bonus Points</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {job.bonusSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Perks */}
          {job.perks && (job.perks as Perk[]).length > 0 && (
            <section className="mb-12">
              <SectionHeading>What&apos;s In It For You</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(job.perks as Perk[]).map((perk, i) => (
                  <div key={i} className="glass-card p-4 flex gap-3 items-start">
                    <span className="text-xl shrink-0">{perk.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-0.5">
                        {perk.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {perk.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interview Process */}
          {job.interviewSteps &&
            (job.interviewSteps as InterviewStep[]).length > 0 && (
              <section className="mb-12">
                <SectionHeading>Interview Process</SectionHeading>
                <div className="space-y-3">
                  {(job.interviewSteps as InterviewStep[]).map((step, i) => (
                    <div
                      key={i}
                      className="glass-card p-4 flex gap-4 items-start"
                    >
                      <span className="text-xs font-mono text-indigo-400 mt-0.5 shrink-0 w-6 text-right">
                        {step.step}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {step.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Apply Section */}
          <section className="glass-card border-t-2 border-t-indigo-500 p-8 text-center">
            {submitted ? (
              <div>
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">
                  Application Received!
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  We&apos;ll review your application and get back to you soon.
                </p>
                {job.interviewLink && (
                  <a
                    href={job.interviewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Start AI Interview
                  </a>
                )}
              </div>
            ) : showApplyForm ? (
              <form onSubmit={handleApply} className="max-w-lg mx-auto">
                <h2 className="text-xl font-bold text-white mb-6">
                  Apply for {job.title}
                </h2>
                <div className="space-y-4 text-left">
                  <div>
                    <label htmlFor="apply-name" className="block text-xs font-medium text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="apply-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-email" className="block text-xs font-medium text-slate-400 mb-1">
                      Email *
                    </label>
                    <input
                      id="apply-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-phone" className="block text-xs font-medium text-slate-400 mb-1">
                      Phone
                    </label>
                    <input
                      id="apply-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-resume" className="block text-xs font-medium text-slate-400 mb-1">
                      Resume (PDF or Word, max 5 MB)
                    </label>
                    <div className="relative">
                      <input
                        id="apply-resume"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setResumeFile(f);
                          if (f) setForm((p) => ({ ...p, resumeUrl: "" }));
                        }}
                        className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-500 file:cursor-pointer focus:border-indigo-500 outline-none transition-colors"
                      />
                      {resumeFile && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-indigo-400">
                          <Paperclip className="h-3 w-3" />
                          {resumeFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="apply-github" className="block text-xs font-medium text-slate-400 mb-1">
                        GitHub URL
                      </label>
                      <input
                        id="apply-github"
                        type="url"
                        value={form.githubUrl}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            githubUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
                        placeholder="https://github.com/you"
                      />
                    </div>
                    <div>
                      <label htmlFor="apply-portfolio" className="block text-xs font-medium text-slate-400 mb-1">
                        Portfolio / Project URL
                      </label>
                      <input
                        id="apply-portfolio"
                        type="url"
                        value={form.portfolioUrl}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            portfolioUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
                        placeholder="https://your-project.vercel.app"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="apply-cover" className="block text-xs font-medium text-slate-400 mb-1">
                      Why does AI-native engineering matter to you? (3 sentences)
                    </label>
                    <textarea
                      id="apply-cover"
                      value={form.coverNote}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          coverNote: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                      placeholder="Tell us why you're excited about building with AI..."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {uploadingResume ? "Uploading resume…" : "Submit Application"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Interested in this role?
                </h2>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Send your GitHub profile, a deployed project link, and a few
                  sentences on why AI-native engineering matters to you.
                </p>
                {job.applicationEmail && (
                  <p className="text-sm text-slate-500 mb-4">
                    Or email us at{" "}
                    <a
                      href={`mailto:${job.applicationEmail}?subject=Application: ${job.title}`}
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                    >
                      {job.applicationEmail}
                    </a>
                  </p>
                )}
                <button
                  onClick={() => setShowApplyForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-8 py-3 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Apply Now
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            )}
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
