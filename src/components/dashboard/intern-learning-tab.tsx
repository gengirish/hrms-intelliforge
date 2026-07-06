"use client";

import {
  GraduationCap,
  Loader2,
  RefreshCw,
  Sparkles,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { cn, formatDateIST } from "@/lib/utils";
import { LEARNING_BASE_URL, type Intern } from "./types";

interface InternLearningTabProps {
  intern: Intern;
  active: boolean;
  learningSyncLoading: boolean;
  onSyncProgress: () => void;
  onOpenEnrollModal: () => void;
}

export function InternLearningTab({
  intern,
  active,
  learningSyncLoading,
  onSyncProgress,
  onOpenEnrollModal,
}: InternLearningTabProps) {
  return (
    <div
      id="panel-learning"
      role="tabpanel"
      aria-labelledby="tab-learning"
      hidden={!active}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
            Learning enrollments
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Courses this intern has access to on{" "}
            <a
              href={LEARNING_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              learning.intelliforge.tech
            </a>
            . They sign in with{" "}
            <span className="text-slate-300">{intern.email}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSyncProgress}
            disabled={learningSyncLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors"
          >
            {learningSyncLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync progress
          </button>
          <button
            type="button"
            onClick={onOpenEnrollModal}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Enroll in a course
          </button>
        </div>
      </div>

      {!intern.learningEnrollments || intern.learningEnrollments.length === 0 ? (
        <div className="text-center py-10">
          <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No Learning enrollments yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click <span className="text-slate-300">Enroll in a course</span> to
            provision access.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {intern.learningEnrollments.map((enr) => {
            const courseLink = enr.courseSlug
              ? `${LEARNING_BASE_URL}/courses/${enr.courseSlug}`
              : LEARNING_BASE_URL;
            const statusClass =
              enr.status === "completed"
                ? "bg-emerald-900/50 text-emerald-400"
                : enr.status === "expired" || enr.status === "failed"
                  ? "bg-red-900/50 text-red-400"
                  : "bg-indigo-900/50 text-indigo-300";
            return (
              <li
                key={enr.id}
                className="flex items-center gap-3 rounded-lg bg-slate-900/50 border border-slate-800 p-3"
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">
                      {enr.courseTitle}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        statusClass
                      )}
                    >
                      {enr.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enrolled {formatDateIST(enr.enrolledAt)}
                    {enr.progressPercent != null && (
                      <>
                        {" "}
                        &middot; {enr.progressCompleted ?? 0}/{enr.progressTotal ?? 0}{" "}
                        lessons ({enr.progressPercent}%)
                      </>
                    )}
                  </p>
                  {enr.progressPercent != null && (
                    <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          enr.status === "completed" ? "bg-emerald-500" : "bg-indigo-500"
                        )}
                        style={{
                          width: `${Math.min(100, Math.max(0, enr.progressPercent))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <a
                  href={courseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors shrink-0"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
