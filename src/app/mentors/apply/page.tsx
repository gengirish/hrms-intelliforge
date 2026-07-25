"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inputClass =
  "w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors";
const labelClass = "block text-xs font-medium text-slate-400 mb-1";

interface FormState {
  name: string;
  email: string;
  phone: string;
  headline: string;
  expertise: string;
  yearsExperience: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  bio: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  headline: "",
  expertise: "",
  yearsExperience: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  bio: "",
};

function MentorApplyForm() {
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get("org")?.trim() || undefined;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      const expertise = form.expertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const yearsExperience = form.yearsExperience.trim()
        ? Number.parseInt(form.yearsExperience, 10)
        : undefined;

      const res = await fetch("/api/mentors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          headline: form.headline.trim() || undefined,
          bio: form.bio.trim() || undefined,
          expertise: expertise.length ? expertise : undefined,
          yearsExperience: Number.isFinite(yearsExperience)
            ? yearsExperience
            : undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          githubUrl: form.githubUrl.trim() || undefined,
          portfolioUrl: form.portfolioUrl.trim() || undefined,
          orgSlug,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      toast.success("Application submitted!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Application received
        </h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6">
          Thanks for applying to mentor with us. Our team will review your
          background and email you at{" "}
          <span className="text-slate-200">{form.email}</span> with next steps.
        </p>
        <Link
          href="/mentors"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Browse current mentors
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-1">
          <label htmlFor="mentor-name" className={labelClass}>
            Full name <span className="text-indigo-400">*</span>
          </label>
          <input
            id="mentor-name"
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="mentor-email" className={labelClass}>
            Email <span className="text-indigo-400">*</span>
          </label>
          <input
            id="mentor-email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="mentor-phone" className={labelClass}>
            Phone
          </label>
          <input
            id="mentor-phone"
            className={inputClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="mentor-years" className={labelClass}>
            Years of experience
          </label>
          <input
            id="mentor-years"
            type="number"
            min={0}
            max={60}
            className={inputClass}
            value={form.yearsExperience}
            onChange={(e) => update("yearsExperience", e.target.value)}
            placeholder="8"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mentor-headline" className={labelClass}>
            Headline
          </label>
          <input
            id="mentor-headline"
            className={inputClass}
            value={form.headline}
            onChange={(e) => update("headline", e.target.value)}
            placeholder="Senior ML Engineer · ex-Google · Generative AI"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mentor-expertise" className={labelClass}>
            Areas of expertise
          </label>
          <input
            id="mentor-expertise"
            className={inputClass}
            value={form.expertise}
            onChange={(e) => update("expertise", e.target.value)}
            placeholder="Machine Learning, System Design, Career Guidance"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Separate skills with commas (up to 20).
          </p>
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="mentor-linkedin" className={labelClass}>
            LinkedIn URL
          </label>
          <input
            id="mentor-linkedin"
            className={inputClass}
            value={form.linkedinUrl}
            onChange={(e) => update("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/username"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="mentor-github" className={labelClass}>
            GitHub URL
          </label>
          <input
            id="mentor-github"
            className={inputClass}
            value={form.githubUrl}
            onChange={(e) => update("githubUrl", e.target.value)}
            placeholder="https://github.com/username"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mentor-portfolio" className={labelClass}>
            Portfolio / website
          </label>
          <input
            id="mentor-portfolio"
            className={inputClass}
            value={form.portfolioUrl}
            onChange={(e) => update("portfolioUrl", e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mentor-bio" className={labelClass}>
            Tell us about yourself
          </label>
          <textarea
            id="mentor-bio"
            rows={5}
            className={`${inputClass} resize-none`}
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="A short bio — what you'd mentor on, who you'd love to help, and why."
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-[11px] text-slate-500 max-w-sm">
          If approved, we&apos;ll email you a link to set your password and
          activate your mentor profile — no password needed now.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit application
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function MentorApplyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <Link
            href="/mentors"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to mentors
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-5">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">
                Apply as a mentor
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Mentor with{" "}
              <span className="gradient-text">IntelliForge</span>
            </h1>
            <p className="text-base text-slate-400 max-w-2xl">
              Guide our bootcamp cohorts and product teams. Share your details
              below — our team reviews every application and follows up by email.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="glass-card rounded-2xl p-8 text-center text-slate-500">
                Loading…
              </div>
            }
          >
            <MentorApplyForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
