"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { cn, formatDateIST, getCurrentISOWeek } from "@/lib/utils";

interface ReviewIntern {
  id: string;
  name: string;
  email: string;
}

export interface WeeklyProgressReviewItem {
  id: string;
  status: string;
  accomplishments: string;
  learningOutcomes: string;
  challenges: string;
  mentorFeedback: string | null;
  feedbackAt: string | null;
  submittedAt: string | null;
  intern: ReviewIntern;
}

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

function statusBadgeClass(status: string) {
  if (status === "SUBMITTED") return "bg-emerald-900/50 text-emerald-400";
  if (status === "DRAFT") return "bg-amber-900/50 text-amber-400";
  return "bg-slate-700 text-slate-300";
}

/** Recent week keys using the same convention as `getCurrentISOWeek` (aligned with tasks). */
function recentWeekOptions(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const t = new Date(d);
    t.setDate(t.getDate() - i * 7);
    const jan1 = new Date(t.getFullYear(), 0, 1);
    const days = Math.floor(
      (t.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
    out.push(`${t.getFullYear()}-W${String(weekNum).padStart(2, "0")}`);
  }
  const seen = new Map<string, true>();
  const deduped: string[] = [];
  for (const w of out) {
    if (!seen.has(w)) {
      seen.set(w, true);
      deduped.push(w);
    }
  }
  return deduped;
}

export default function DashboardWeeklyProgressPage() {
  const defaultWeek = useMemo(() => getCurrentISOWeek(), []);
  const [week, setWeek] = useState(defaultWeek);
  const [weekKey, setWeekKey] = useState(defaultWeek);
  const [items, setItems] = useState<WeeklyProgressReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<WeeklyProgressReviewItem | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const weekOptions = useMemo(() => recentWeekOptions(16), []);

  const loadReview = useCallback(async (w: string) => {
    if (!WEEK_KEY_RE.test(w)) {
      toast.error("Week must look like 2026-W22");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/weekly-progress/review?week=${encodeURIComponent(w)}`
      );
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load weekly progress");
      }
      const data = await res.json();
      setWeekKey(data.weekKey ?? w);
      setItems(data.items ?? []);
      setForbidden(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReview(defaultWeek);
  }, [defaultWeek, loadReview]);

  async function applyWeek() {
    await loadReview(week.trim() || defaultWeek);
  }

  async function saveFeedback(reportId: string) {
    setSavingId(reportId);
    try {
      const res = await fetch(`/api/weekly-progress/${reportId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorFeedback: feedbackDraft }),
      });
      if (res.status === 401 || res.status === 403) {
        toast.error("You don't have permission to save feedback");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      const updated: WeeklyProgressReviewItem = await res.json();
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row))
      );
      toast.success("Feedback saved");
      setModalItem(null);
      setExpandedId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  function openModal(row: WeeklyProgressReviewItem) {
    setModalItem(row);
    setFeedbackDraft(row.mentorFeedback ?? "");
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full text-center">
            <BookOpen className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin access required</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in with an admin or mentor account to review weekly progress.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Back to dashboard
            </Link>
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
      <main
        id="main-content"
        className="flex-1 mx-auto max-w-6xl w-full px-4 py-8"
      >
        <Breadcrumbs className="mb-4" />
        <DashboardSubnav className="mb-6" />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Weekly progress review</h1>
          <p className="mt-1 text-slate-400">
            Read intern reports for a week and leave mentor feedback.
          </p>
        </div>

        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label htmlFor="week-select" className="text-sm font-medium text-slate-300">
              Week
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                id="week-select"
                value={weekOptions.includes(week) ? week : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    setWeek(v);
                    void loadReview(v);
                  }
                }}
                className="w-full sm:max-w-xs rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="" disabled>
                  Pick a recent week…
                </option>
                {weekOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                    {w === defaultWeek ? " (current)" : ""}
                  </option>
                ))}
              </select>
              <div className="flex flex-1 gap-2 items-center">
                <input
                  type="text"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  placeholder="YYYY-Www"
                  aria-label="Week key"
                  className="flex-1 min-w-0 rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => void applyWeek()}
                  disabled={loading}
                  className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  Load
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Showing reports for <span className="text-slate-300 font-mono">{weekKey}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              No weekly progress reports for this week yet.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="w-8 py-3 px-2" aria-hidden />
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Intern
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                      Submitted
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium hidden lg:table-cell">
                      Feedback
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const open = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2 px-2 align-middle">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`expand-${row.id}`}
                              onClick={() =>
                                setExpandedId((id) => (id === row.id ? null : row.id))
                              }
                              className="p-1 rounded text-slate-400 hover:text-white"
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {row.intern.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate">
                                  {row.intern.name}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {row.intern.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                statusBadgeClass(row.status)
                              )}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell whitespace-nowrap">
                            {row.submittedAt
                              ? formatDateIST(row.submittedAt)
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell max-w-[12rem] truncate" title={row.mentorFeedback ?? ""}>
                            {row.mentorFeedback ? "Has feedback" : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openModal(row)}
                              className="rounded-lg bg-indigo-600/90 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-slate-900/40">
                            <td colSpan={6} className="px-4 pb-4 pt-0" id={`expand-${row.id}`}>
                              <div className="ml-6 mt-2 space-y-3 text-sm border-l-2 border-indigo-500/40 pl-4">
                                <Field label="Accomplishments" text={row.accomplishments} />
                                <Field label="Learning outcomes" text={row.learningOutcomes} />
                                <Field label="Challenges" text={row.challenges} />
                                {row.mentorFeedback && (
                                  <Field label="Current feedback" text={row.mentorFeedback} />
                                )}
                                <button
                                  type="button"
                                  onClick={() => openModal(row)}
                                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                                >
                                  Open editor to add or edit feedback →
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalItem(null);
          }}
        >
          <div
            className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 shadow-xl border border-slate-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="weekly-review-dialog-title"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2
                  id="weekly-review-dialog-title"
                  className="text-lg font-bold text-white"
                >
                  {modalItem.intern.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{modalItem.intern.email}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">{weekKey}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm mb-6">
              <Field label="Accomplishments" text={modalItem.accomplishments} />
              <Field label="Learning outcomes" text={modalItem.learningOutcomes} />
              <Field label="Challenges" text={modalItem.challenges} />
            </div>

            <label htmlFor="weekly-progress-mentor-feedback" className="block text-sm font-medium text-slate-300 mb-2">
              Mentor feedback
            </label>
            <textarea
              id="weekly-progress-mentor-feedback"
              value={feedbackDraft}
              onChange={(e) => setFeedbackDraft(e.target.value)}
              rows={6}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-y min-h-[120px]"
              placeholder="Write constructive feedback for this week…"
            />
            {modalItem.feedbackAt && (
              <p className="text-xs text-slate-500 mt-2">
                Last saved {formatDateIST(modalItem.feedbackAt)}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveFeedback(modalItem.id)}
                disabled={savingId === modalItem.id}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                {savingId === modalItem.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save feedback
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  const empty = !text?.trim();
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </h3>
      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
        {empty ? <span className="text-slate-600 italic">No content</span> : text}
      </p>
    </div>
  );
}
