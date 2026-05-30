"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Loader2, History } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, getCurrentISOWeek } from "@/lib/utils";

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

interface WeeklyProgressRecord {
  id: string;
  weekKey: string;
  accomplishments: string;
  learningOutcomes: string;
  challenges: string;
  status: "DRAFT" | "SUBMITTED";
  mentorFeedback: string | null;
  internName?: string;
}

interface HistoryEntry {
  id: string;
  weekKey?: string;
  status: string;
  submittedAt?: string | null;
}

function historyWeekKey(entry: HistoryEntry): string | null {
  const e = entry as unknown as Record<string, unknown>;
  const wk = entry.weekKey ?? e.week ?? e.week_key;
  return typeof wk === "string" && wk ? wk : null;
}

function pickHistoryList(data: Record<string, unknown>): HistoryEntry[] {
  if (Array.isArray(data)) {
    return data as HistoryEntry[];
  }
  const raw =
    data.history ??
    data.reports ??
    data.items ??
    data.entries ??
    data.weeks;
  if (!Array.isArray(raw)) return [];
  return raw as HistoryEntry[];
}

function normalizeReport(
  raw: Record<string, unknown>,
  fallbackWeek: string
): WeeklyProgressRecord | null {
  const id = (raw.id as string) ?? "";
  if (!id) return null;
  const weekKey =
    (raw.weekKey as string) ?? (raw.week as string) ?? fallbackWeek;
  return {
    id,
    weekKey,
    accomplishments: String(raw.accomplishments ?? ""),
    learningOutcomes: String(raw.learningOutcomes ?? raw.learning_outcomes ?? ""),
    challenges: String(raw.challenges ?? ""),
    status: raw.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    mentorFeedback:
      raw.mentorFeedback != null
        ? String(raw.mentorFeedback)
        : raw.mentor_feedback != null
          ? String(raw.mentor_feedback)
          : null,
    internName: raw.internName != null ? String(raw.internName) : undefined,
  };
}

function WeeklyProgressSuspenseFallback() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4"
      >
        <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading weekly progress…</p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}

export default function WeeklyProgressPage() {
  return (
    <Suspense fallback={<WeeklyProgressSuspenseFallback />}>
      <WeeklyProgressContent />
    </Suspense>
  );
}

function WeeklyProgressContent() {
  const searchParams = useSearchParams();
  const weekFromUrl = searchParams.get("week");

  const activeWeek = useMemo(() => {
    if (weekFromUrl && WEEK_KEY_RE.test(weekFromUrl)) return weekFromUrl;
    return getCurrentISOWeek();
  }, [weekFromUrl]);

  const [internName, setInternName] = useState("");
  const [record, setRecord] = useState<WeeklyProgressRecord | null>(null);
  const [accomplishments, setAccomplishments] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [challenges, setChallenges] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitted = record?.status === "SUBMITTED";
  const readOnly = isSubmitted;

  const loadProgress = useCallback(async () => {
    const res = await fetch(
      `/api/weekly-progress?week=${encodeURIComponent(activeWeek)}`,
      { cache: "no-store" }
    );
    if (res.status === 401) {
      return { type: "unauthorized" as const };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : "Failed to load weekly progress"
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const raw =
      (data.report as Record<string, unknown> | undefined) ??
      (data.weeklyProgress as Record<string, unknown> | undefined) ??
      data;
    const normalized = normalizeReport(
      raw as Record<string, unknown>,
      activeWeek
    );
    return { type: "ok" as const, data, normalized };
  }, [activeWeek]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/weekly-progress/history", { cache: "no-store" });
    if (res.status === 401) return [];
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, unknown>;
    return pickHistoryList(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setUnauthorized(false);
      try {
        const result = await loadProgress();
        if (cancelled) return;
        if (result.type === "unauthorized") {
          setUnauthorized(true);
          setRecord(null);
          setInternName("");
          setAccomplishments("");
          setLearningOutcomes("");
          setChallenges("");
          return;
        }
        const { normalized } = result;
        if (normalized) {
          setRecord(normalized);
          setInternName(normalized.internName ?? "");
          setAccomplishments(normalized.accomplishments);
          setLearningOutcomes(normalized.learningOutcomes);
          setChallenges(normalized.challenges);
        } else {
          setRecord(null);
          setInternName(
            typeof result.data.internName === "string"
              ? result.data.internName
              : ""
          );
          setAccomplishments("");
          setLearningOutcomes("");
          setChallenges("");
        }

        const hist = await loadHistory();
        if (!cancelled) setHistory(hist);
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load weekly progress";
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProgress, loadHistory]);

  async function saveDraft() {
    if (readOnly) return;
    setSavingDraft(true);
    try {
      const res = await fetch("/api/weekly-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: activeWeek,
          weekKey: activeWeek,
          accomplishments,
          learningOutcomes,
          challenges,
        }),
      });
      if (res.status === 401) {
        toast.error("Please sign in to save.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Failed to save draft"
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      const raw =
        (body.report as Record<string, unknown> | undefined) ??
        (body.weeklyProgress as Record<string, unknown> | undefined) ??
        body;
      const normalized = normalizeReport(raw as Record<string, unknown>, activeWeek);
      if (normalized) {
        setRecord(normalized);
        if (normalized.internName) setInternName(normalized.internName);
      }
      toast.success("Draft saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save draft";
      toast.error(message);
    } finally {
      setSavingDraft(false);
    }
  }

  async function submitReport() {
    if (readOnly) return;
    const id = record?.id;
    if (!id) {
      toast.error("Save a draft first, then submit.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/weekly-progress/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 401) {
        toast.error("Please sign in to submit.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Failed to submit"
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      const raw =
        (body.report as Record<string, unknown> | undefined) ??
        (body.weeklyProgress as Record<string, unknown> | undefined) ??
        body;
      const normalized = normalizeReport(raw as Record<string, unknown>, activeWeek);
      if (normalized) {
        setRecord(normalized);
        setAccomplishments(normalized.accomplishments);
        setLearningOutcomes(normalized.learningOutcomes);
        setChallenges(normalized.challenges);
      } else {
        setRecord((prev) => (prev ? { ...prev, status: "SUBMITTED" } : prev));
      }
      const hist = await loadHistory();
      setHistory(hist);
      toast.success("Weekly progress submitted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading weekly progress…</p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full text-center">
            <BookOpen className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Weekly progress</h1>
            <p className="text-sm text-slate-400 mt-3">
              Sign in with your intern account to view and submit your weekly progress
              report.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/sign-in"
                className="inline-flex justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 font-semibold text-white transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/intern-onboarding"
                className="inline-flex justify-center rounded-lg border border-slate-600 px-6 py-2.5 font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Onboarding
              </Link>
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Weekly progress</h1>
          <p className="mt-1 text-slate-400">
            {internName ? (
              <>
                {internName} &middot; Week {activeWeek}
              </>
            ) : (
              <>Week {activeWeek}</>
            )}
          </p>
          {weekFromUrl &&
            WEEK_KEY_RE.test(weekFromUrl) &&
            weekFromUrl !== getCurrentISOWeek() && (
            <Link
              href="/weekly-progress"
              className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              ← Back to current week
            </Link>
          )}
        </div>

        <div className="glass-card p-6 space-y-6">
          <div>
            <label
              htmlFor="wp-accomplishments"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Accomplishments
            </label>
            <textarea
              id="wp-accomplishments"
              rows={4}
              disabled={readOnly}
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              className={cn(
                "w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors resize-none",
                readOnly
                  ? "opacity-80 cursor-not-allowed"
                  : "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              )}
              placeholder="What you shipped or completed this week…"
            />
          </div>
          <div>
            <label
              htmlFor="wp-learning"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Learning outcomes
            </label>
            <textarea
              id="wp-learning"
              rows={4}
              disabled={readOnly}
              value={learningOutcomes}
              onChange={(e) => setLearningOutcomes(e.target.value)}
              className={cn(
                "w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors resize-none",
                readOnly
                  ? "opacity-80 cursor-not-allowed"
                  : "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              )}
              placeholder="Skills, concepts, or tools you learned…"
            />
          </div>
          <div>
            <label
              htmlFor="wp-challenges"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Challenges
            </label>
            <textarea
              id="wp-challenges"
              rows={4}
              disabled={readOnly}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              className={cn(
                "w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors resize-none",
                readOnly
                  ? "opacity-80 cursor-not-allowed"
                  : "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              )}
              placeholder="Blockers, risks, or where you need support…"
            />
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={savingDraft}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {savingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save draft
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={submitting}
                className="rounded-lg border border-emerald-600/60 bg-emerald-950/40 hover:bg-emerald-900/50 px-6 py-2.5 text-sm font-semibold text-emerald-200 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Submit
              </button>
            </div>
          )}

          {isSubmitted && record?.mentorFeedback ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-2">
                Mentor feedback
              </h2>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {record.mentorFeedback}
              </p>
            </div>
          ) : null}
        </div>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Past weeks</h2>
          </div>
          {history.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-sm">
              No history yet. Saved and submitted weeks will appear here.
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((entry) => {
                const wk = historyWeekKey(entry);
                if (!wk) return null;
                const active = wk === activeWeek;
                return (
                  <li key={entry.id}>
                    <Link
                      href={`/weekly-progress?week=${encodeURIComponent(wk)}`}
                      className={cn(
                        "glass-card flex items-center justify-between gap-3 p-4 transition-colors",
                        active
                          ? "ring-1 ring-indigo-500/50 bg-indigo-950/20"
                          : "hover:bg-slate-800/30"
                      )}
                    >
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-indigo-200">
                        {wk}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium rounded-full px-2 py-0.5",
                          entry.status === "SUBMITTED"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-600/40 text-slate-300"
                        )}
                      >
                        {entry.status === "SUBMITTED" ? "Submitted" : "Draft"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
