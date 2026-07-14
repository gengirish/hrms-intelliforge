"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Sparkles, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkedInMentorDraft {
  name: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
  linkedinUrl: string;
  githubUrl: string | null;
  avatarUrl: string | null;
}

interface LinkedInMentorImportFormProps {
  mode: "self" | "create";
  className?: string;
  onSelfApplied?: () => void;
  onMentorCreated?: (result: { email: string; slug?: string }) => void;
}

export function LinkedInMentorImportForm({
  mode,
  className,
  onSelfApplied,
  onMentorCreated,
}: LinkedInMentorImportFormProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileText, setProfileText] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState<LinkedInMentorDraft | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  async function handlePreview() {
    if (!linkedinUrl.trim()) {
      toast.error("Enter a LinkedIn profile URL");
      return;
    }
    setPreviewing(true);
    setWarning(null);
    try {
      const res = await fetch("/api/mentors/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          linkedinUrl: linkedinUrl.trim(),
          profileText: profileText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not parse LinkedIn profile");
        return;
      }
      setDraft(data.draft);
      if (mode === "create" && data.draft.name) {
        setName(data.draft.name);
      }
      setWarning(data.warning ?? null);
      toast.success("Profile draft ready — review and save");
    } catch {
      toast.error("Could not parse LinkedIn profile");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit() {
    if (!draft && !linkedinUrl.trim()) {
      toast.error("Preview the profile first or enter a LinkedIn URL");
      return;
    }

    if (mode === "create") {
      if (!email.trim()) {
        toast.error("Work email is required");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);
    try {
      const base = {
        linkedinUrl: linkedinUrl.trim(),
        profileText: profileText.trim() || undefined,
        headline: draft?.headline,
        bio: draft?.bio,
        expertise: draft?.expertise,
        yearsExperience: draft?.yearsExperience,
        githubUrl: draft?.githubUrl ?? undefined,
        avatarUrl: draft?.avatarUrl ?? undefined,
        isPublic,
      };

      const body =
        mode === "self"
          ? { action: "apply-self", ...base }
          : {
              action: "create-mentor",
              ...base,
              email: email.trim(),
              name: name.trim() || undefined,
              password,
              confirmPassword,
              sendWelcomeEmail,
            };

      const res = await fetch("/api/mentors/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.upgrade) {
          toast.error(data.error || "Mentor seat limit reached");
        } else {
          toast.error(data.error || "Import failed");
        }
        return;
      }

      if (mode === "self") {
        toast.success("Mentor profile updated from LinkedIn");
        onSelfApplied?.();
      } else {
        toast.success(data.message || "Mentor created from LinkedIn");
        onMentorCreated?.({
          email: data.email,
          slug: data.profile?.slug,
        });
        setEmail("");
        setName("");
        setPassword("");
        setConfirmPassword("");
        setDraft(null);
        setLinkedinUrl("");
        setProfileText("");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("glass-card p-6 space-y-4", className)}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[#0A66C2]/15 p-2">
          <Link2 className="h-5 w-5 text-[#70B5F9]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            {mode === "self" ? "Import from LinkedIn" : "Create mentor from LinkedIn"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Paste a LinkedIn profile URL. For best results, copy the About and Experience
            sections into the text box — LinkedIn often blocks automatic fetch.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="linkedin-url" className="block text-xs font-medium text-slate-400 mb-1">
          LinkedIn profile URL
        </label>
        <input
          id="linkedin-url"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/jane-doe/"
          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="profile-text" className="block text-xs font-medium text-slate-400 mb-1">
          Profile text (recommended)
        </label>
        <textarea
          id="profile-text"
          value={profileText}
          onChange={(e) => setProfileText(e.target.value)}
          rows={6}
          placeholder="Paste LinkedIn About, headline, skills, and experience here..."
          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none resize-y"
        />
      </div>

      <button
        type="button"
        onClick={() => void handlePreview()}
        disabled={previewing || !linkedinUrl.trim()}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50"
      >
        {previewing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate preview
      </button>

      {warning && (
        <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          {warning}
        </p>
      )}

      {draft && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Preview</p>
          <p className="text-sm font-semibold text-white">{draft.name}</p>
          {draft.headline && (
            <p className="text-sm text-indigo-300">{draft.headline}</p>
          )}
          {draft.bio && (
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{draft.bio}</p>
          )}
          {draft.expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.expertise.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {draft.yearsExperience != null && (
            <p className="text-xs text-slate-500">
              ~{draft.yearsExperience} years experience (estimated)
            </p>
          )}
        </div>
      )}

      {mode === "create" && draft && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label htmlFor="mentor-email" className="block text-xs font-medium text-slate-400 mb-1">
              Work email
            </label>
            <input
              id="mentor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="mentor-name" className="block text-xs font-medium text-slate-400 mb-1">
              Display name
            </label>
            <input
              id="mentor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="mentor-password" className="block text-xs font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              id="mentor-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="mentor-confirm" className="block text-xs font-medium text-slate-400 mb-1">
              Confirm password
            </label>
            <input
              id="mentor-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              className="rounded border-slate-600"
            />
            Email sign-in instructions to the new mentor
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-slate-600"
          />
          Show on program mentor directory
        </label>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || (!draft && mode === "create")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "create" ? (
            <UserPlus className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {mode === "self" ? "Apply to my profile" : "Create mentor"}
        </button>
      </div>
    </div>
  );
}
