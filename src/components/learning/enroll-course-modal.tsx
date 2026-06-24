"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LearningCourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  price: number;
  currency: string;
  lesson_count: number;
  enrollment_count: number;
}

export interface EnrollmentRecord {
  id: string;
  internId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string | null;
  learningEnrollmentId: string | null;
  status: string;
  progressTotal?: number | null;
  progressCompleted?: number | null;
  progressPercent?: number | null;
  completedAt?: string | null;
  lastSyncedAt?: string | null;
  enrolledAt: string;
}

interface EnrollCourseModalProps {
  internId: string;
  internName: string;
  open: boolean;
  onClose: () => void;
  onEnrolled: (enrollment: EnrollmentRecord, alreadyExisted: boolean) => void;
  /**
   * Course ids the intern is already enrolled in. Disabled in the picker so
   * the admin can't accidentally re-trigger the same enrollment.
   */
  enrolledCourseIds?: string[];
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; status?: number }
  | { kind: "ready"; courses: LearningCourseSummary[] };

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

export function EnrollCourseModal({
  internId,
  internName,
  open,
  onClose,
  onEnrolled,
  enrolledCourseIds = [],
}: EnrollCourseModalProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load courses when the modal opens.
  useEffect(() => {
    if (!open) return;
    setState({ kind: "loading" });
    setSelectedId(null);
    setSearch("");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/learning/courses", {
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({
            kind: "error",
            status: res.status,
            message:
              data?.error ||
              `Failed to load courses (HTTP ${res.status})`,
          });
          return;
        }
        const courses: LearningCourseSummary[] = Array.isArray(data?.courses)
          ? data.courses
          : [];
        setState({ kind: "ready", courses });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Network error fetching courses",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // A11y: lock background scroll, close on Esc, autofocus search.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Defer focus so the modal renders first.
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, submitting, onClose]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [] as LearningCourseSummary[];
    const q = search.trim().toLowerCase();
    if (!q) return state.courses;
    return state.courses.filter((c) =>
      [c.title, c.slug, c.description, c.level]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [state, search]);

  const enrolledSet = useMemo(
    () => new Set(enrolledCourseIds),
    [enrolledCourseIds]
  );

  const selectedCourse =
    state.kind === "ready"
      ? state.courses.find((c) => c.id === selectedId) ?? null
      : null;

  async function handleEnroll() {
    if (!selectedCourse) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learning/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ internId, courseId: selectedCourse.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || `Enrollment failed (HTTP ${res.status})`
        );
      }
      const enrollment: EnrollmentRecord | undefined = data?.enrollment;
      if (!enrollment?.id) {
        throw new Error("Server returned a malformed enrollment");
      }
      const alreadyExisted = !!data?.alreadyExisted;
      toast.success(
        alreadyExisted
          ? `${internName} was already enrolled in ${selectedCourse.title}`
          : `Enrolled ${internName} in ${selectedCourse.title}`
      );
      onEnrolled(enrollment, alreadyExisted);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:py-12 bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        // Click on backdrop (not the dialog itself) closes the modal.
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-modal-title"
        aria-describedby="enroll-modal-description"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <h2
              id="enroll-modal-title"
              className="text-lg font-bold text-white flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Enroll in IntelliForge Learning
            </h2>
            <p
              id="enroll-modal-description"
              className="mt-0.5 text-xs text-slate-400"
            >
              Enrolling{" "}
              <span className="font-medium text-slate-200">{internName}</span>{" "}
              into a course on{" "}
              <a
                href="https://learning.intelliforge.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline inline-flex items-center gap-1"
              >
                learning.intelliforge.tech
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close enrollment dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-800">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses by title, level, or keyword..."
              className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
              aria-label="Search courses"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {state.kind === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
              <p className="text-sm">Loading available courses...</p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm font-medium text-white">
                {state.status === 503
                  ? "Learning integration not configured"
                  : "Couldn't load courses"}
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-md">
                {state.message}
              </p>
              {state.status === 503 && (
                <p className="mt-3 text-xs text-slate-500">
                  An admin needs to set <code className="text-slate-300">LEARNING_API_KEY</code>{" "}
                  in the HRMS deployment env.
                </p>
              )}
            </div>
          )}

          {state.kind === "ready" && filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-400">
              {state.courses.length === 0
                ? "No published courses available on Learning yet."
                : "No courses match your search."}
            </div>
          )}

          {state.kind === "ready" && filtered.length > 0 && (
            <ul role="radiogroup" aria-label="Available courses" className="space-y-2">
              {filtered.map((course) => {
                const alreadyEnrolled = enrolledSet.has(course.id);
                const isSelected = selectedId === course.id;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={alreadyEnrolled}
                      disabled={alreadyEnrolled || submitting}
                      onClick={() => setSelectedId(course.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        alreadyEnrolled
                          ? "border-slate-800 bg-slate-900/40 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white text-sm">
                              {course.title}
                            </span>
                            {course.level && (
                              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                {course.level}
                              </span>
                            )}
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                course.price === 0
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-amber-500/15 text-amber-300"
                              )}
                            >
                              {formatPrice(course.price, course.currency)}
                            </span>
                            {alreadyEnrolled && (
                              <span className="inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                                Already enrolled
                              </span>
                            )}
                          </div>
                          {course.description && (
                            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-500">
                            {course.lesson_count} lessons
                            {" · "}
                            {course.enrollment_count} learners enrolled
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-slate-800 bg-slate-900/60 rounded-b-2xl">
          <p className="text-xs text-slate-500 truncate">
            {selectedCourse
              ? `Enroll into "${selectedCourse.title}"`
              : "Pick a course to enable enrollment."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={!selectedCourse || submitting || state.kind !== "ready"}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enroll
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
