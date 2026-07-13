"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  ExternalLink,
  UserCircle,
  Globe,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { AvailabilityEditor } from "@/components/mentors/availability-editor";
import { LinkedInMentorImportForm } from "@/components/mentors/linkedin-import-form";
import type { AvailabilitySlot } from "@/components/mentors/availability-display";

interface MentorProfile {
  id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  avatarUrl: string | null;
  hourlyRatePaise: number | null;
  isPublic: boolean;
  availability: AvailabilitySlot[];
}

export default function MentorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileKey, setProfileKey] = useState(0);
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [form, setForm] = useState({
    headline: "",
    bio: "",
    expertise: [] as string[],
    yearsExperience: "",
    linkedinUrl: "",
    githubUrl: "",
    avatarUrl: "",
    hourlyRateRupees: "",
    isPublic: false,
    availability: [] as AvailabilitySlot[],
  });

  useEffect(() => {
    fetch("/api/mentors/me")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          toast.error("You don't have permission to manage a mentor profile");
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        const p = data.profile as MentorProfile | null;
        setProfile(p);
        if (p) {
          setForm({
            headline: p.headline ?? "",
            bio: p.bio ?? "",
            expertise: p.expertise ?? [],
            yearsExperience: p.yearsExperience?.toString() ?? "",
            linkedinUrl: p.linkedinUrl ?? "",
            githubUrl: p.githubUrl ?? "",
            avatarUrl: p.avatarUrl ?? "",
            hourlyRateRupees:
              p.hourlyRatePaise != null
                ? String(p.hourlyRatePaise / 100)
                : "",
            isPublic: p.isPublic,
            availability: p.availability ?? [],
          });
        }
      })
      .catch(() => toast.error("Failed to load mentor profile"))
      .finally(() => setLoading(false));
  }, [profileKey]);

  function reloadProfile() {
    setLoading(true);
    setProfileKey((k) => k + 1);
  }

  function addExpertise() {
    const tag = expertiseInput.trim();
    if (!tag) return;
    if (form.expertise.includes(tag)) {
      setExpertiseInput("");
      return;
    }
    if (form.expertise.length >= 20) {
      toast.error("Maximum 20 expertise tags");
      return;
    }
    setForm((p) => ({ ...p, expertise: [...p.expertise, tag] }));
    setExpertiseInput("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const hourlyRatePaise = form.hourlyRateRupees
        ? Math.round(Number.parseFloat(form.hourlyRateRupees) * 100)
        : null;

      const res = await fetch("/api/mentors/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: form.headline || null,
          bio: form.bio || null,
          expertise: form.expertise,
          yearsExperience: form.yearsExperience
            ? Number.parseInt(form.yearsExperience, 10)
            : null,
          linkedinUrl: form.linkedinUrl || null,
          githubUrl: form.githubUrl || null,
          avatarUrl: form.avatarUrl || null,
          hourlyRatePaise,
          isPublic: form.isPublic,
          availability: form.availability,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save profile");
        return;
      }

      setProfile(data.profile);
      toast.success("Mentor profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Mentor Profile" },
          ]}
        />
        <DashboardSubnav className="mb-8" />

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCircle className="h-7 w-7 text-indigo-400" />
              Public Mentor Profile
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              List yourself on the mentor marketplace so interns and candidates can book sessions.
            </p>
          </div>
          {profile?.isPublic && profile.slug && (
            <Link
              href={`/mentors/${profile.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public page
            </Link>
          )}
        </div>

        <LinkedInMentorImportForm
          mode="self"
          className="mb-6"
          onSelfApplied={reloadProfile}
        />

        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Public listing</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublic}
                onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.isPublic
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {form.isPublic ? (
                  <>
                    <Globe className="h-3.5 w-3.5" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Hidden
                  </>
                )}
              </button>
            </div>

            <div>
              <label htmlFor="headline" className="block text-xs font-medium text-slate-400 mb-1">
                Headline
              </label>
              <input
                id="headline"
                value={form.headline}
                onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="e.g. Senior ML Engineer · Ex-Google"
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-xs font-medium text-slate-400 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={5}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none resize-none"
                placeholder="Tell potential mentees about your background and mentoring style..."
              />
            </div>

            <div>
              <label htmlFor="expertise-input" className="block text-xs font-medium text-slate-400 mb-1">
                Expertise
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="expertise-input"
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExpertise();
                    }
                  }}
                  className="flex-1 rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                  placeholder="Add a skill and press Enter"
                />
                <button
                  type="button"
                  onClick={addExpertise}
                  className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-white"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          expertise: p.expertise.filter((t) => t !== tag),
                        }))
                      }
                      className="text-indigo-400/60 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="years" className="block text-xs font-medium text-slate-400 mb-1">
                  Years of experience
                </label>
                <input
                  id="years"
                  type="number"
                  min={0}
                  max={60}
                  value={form.yearsExperience}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yearsExperience: e.target.value }))
                  }
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="rate" className="block text-xs font-medium text-slate-400 mb-1">
                  Hourly rate (₹)
                </label>
                <input
                  id="rate"
                  type="number"
                  min={0}
                  value={form.hourlyRateRupees}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hourlyRateRupees: e.target.value }))
                  }
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="linkedin" className="block text-xs font-medium text-slate-400 mb-1">
                  LinkedIn URL
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, linkedinUrl: e.target.value }))
                  }
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="github" className="block text-xs font-medium text-slate-400 mb-1">
                  GitHub URL
                </label>
                <input
                  id="github"
                  type="url"
                  value={form.githubUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, githubUrl: e.target.value }))
                  }
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="avatar" className="block text-xs font-medium text-slate-400 mb-1">
                Avatar URL
              </label>
              <input
                id="avatar"
                type="url"
                value={form.avatarUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, avatarUrl: e.target.value }))
                }
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="glass-card p-6">
            <AvailabilityEditor
              slots={form.availability}
              onChange={(availability) => setForm((p) => ({ ...p, availability }))}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Profile
          </button>
        </form>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
