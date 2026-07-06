"use client";

import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Send,
  FileSignature,
  CheckCircle2,
  Bell,
  Award,
  UserX,
  UserCheck,
} from "lucide-react";
import { EnrollCourseModal } from "@/components/learning/enroll-course-modal";
import { cn, getStatusColor } from "@/lib/utils";
import { InternOverviewTab } from "./intern-overview-tab";
import { InternAttendanceTab } from "./intern-attendance-tab";
import { InternTasksTab } from "./intern-tasks-tab";
import { InternLearningTab } from "./intern-learning-tab";
import { InternEmailsTab } from "./intern-emails-tab";
import { InternNotificationsTab } from "./intern-notifications-tab";
import { InternAnalyticsTab } from "./intern-analytics-tab";
import type {
  Intern,
  DashboardTab,
  DocVerification,
  MentorOption,
  NotificationRecord,
  PerformanceScoreRecord,
  PerformanceReviewRecord,
} from "./types";
import type { EnrollmentRecord as LearningEnrollmentRecord } from "@/components/learning/enroll-course-modal";

interface InternDetailPanelProps {
  intern: Intern;
  detailLoading: boolean;
  onBack: () => void;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  perfScores: PerformanceScoreRecord[];
  actionLoading: string | null;
  onAction: (action: string) => void;
  onSendForEsign: () => void;
  stipendEdit: number | null;
  onStipendChange: (value: number) => void;
  isSavingStipend: boolean;
  onSaveStipend: () => void;
  docVerifications: DocVerification[];
  onTriggerVerification: (
    documentType: "AADHAAR" | "PAN",
    documentUrl: string
  ) => void;
  onReviewDocument: (
    verificationId: string,
    action: "APPROVE" | "REJECT"
  ) => void;
  mentorOptions: MentorOption[];
  mentorSaving: boolean;
  onSaveMentor: (mentorId: string | null) => void;
  learningSyncLoading: boolean;
  onSyncLearningProgress: () => void;
  enrollModalOpen: boolean;
  onEnrollModalOpenChange: (open: boolean) => void;
  onEnrolled: (enrollment: LearningEnrollmentRecord) => void;
  notifications: NotificationRecord[];
  notificationsLoading: boolean;
  analyticsLoading: boolean;
  perfReview: PerformanceReviewRecord | null;
  reviewLoading: boolean;
  onRegenerateReview: () => void;
}

export function InternDetailPanel({
  intern,
  detailLoading,
  onBack,
  activeTab,
  onTabChange,
  perfScores,
  actionLoading,
  onAction,
  onSendForEsign,
  stipendEdit,
  onStipendChange,
  isSavingStipend,
  onSaveStipend,
  docVerifications,
  onTriggerVerification,
  onReviewDocument,
  mentorOptions,
  mentorSaving,
  onSaveMentor,
  learningSyncLoading,
  onSyncLearningProgress,
  enrollModalOpen,
  onEnrollModalOpenChange,
  onEnrolled,
  notifications,
  notificationsLoading,
  analyticsLoading,
  perfReview,
  reviewLoading,
  onRegenerateReview,
}: InternDetailPanelProps) {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Intern List
      </button>

      {detailLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          <div className="glass-card p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xl font-bold text-white">
                  {intern.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{intern.name}</h1>
                  <p className="text-sm text-slate-400">
                    {intern.role} &middot; {intern.college}
                  </p>
                  <p className="text-xs text-slate-500">{intern.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    getStatusColor(intern.status)
                  )}
                >
                  {intern.status}
                </span>
                {perfScores.length > 0 &&
                  (() => {
                    const latest = perfScores[perfScores.length - 1];
                    const riskColors: Record<string, string> = {
                      LOW: "bg-emerald-900/50 text-emerald-400",
                      MEDIUM: "bg-yellow-900/50 text-yellow-400",
                      HIGH: "bg-orange-900/50 text-orange-400",
                      CRITICAL: "bg-red-900/50 text-red-400",
                    };
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                          riskColors[latest.riskLevel] ?? riskColors.LOW
                        )}
                      >
                        {latest.riskLevel === "HIGH" ||
                        latest.riskLevel === "CRITICAL" ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {latest.riskLevel} Risk
                      </span>
                    );
                  })()}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {intern.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAction("send_offer")}
                    disabled={
                      actionLoading === "send_offer" || intern.stipendPaise === 0
                    }
                    title={
                      intern.stipendPaise === 0
                        ? "Set the stipend first before sending the offer"
                        : undefined
                    }
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                  >
                    {actionLoading === "send_offer" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Offer Letter
                  </button>
                  <button
                    onClick={onSendForEsign}
                    disabled={
                      actionLoading === "send_esign" || intern.stipendPaise === 0
                    }
                    title={
                      intern.stipendPaise === 0
                        ? "Set the stipend first before sending for e-sign"
                        : "Send offer for Aadhaar e-sign via Digio"
                    }
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                  >
                    {actionLoading === "send_esign" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSignature className="h-4 w-4" />
                    )}
                    Send for E-Sign
                  </button>
                  {intern.stipendPaise === 0 && (
                    <span className="text-xs text-amber-400">Set stipend first →</span>
                  )}
                </div>
              )}
              {intern.status === "OFFERED" && (
                <button
                  onClick={() => onAction("approve_offer")}
                  disabled={actionLoading === "approve_offer"}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  {actionLoading === "approve_offer" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve Offer (Mark Active)
                </button>
              )}
              {intern.status === "ACTIVE" && (
                <>
                  <button
                    onClick={() => onAction("send_reminder")}
                    disabled={actionLoading === "send_reminder"}
                    className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                  >
                    {actionLoading === "send_reminder" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                    Send Task Reminder
                  </button>
                  <button
                    onClick={() => onAction("mark_complete")}
                    disabled={actionLoading === "mark_complete"}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                  >
                    {actionLoading === "mark_complete" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                    Mark Complete + Send Certificate
                  </button>
                </>
              )}
              {!intern.deactivated ? (
                <button
                  onClick={() => onAction("deactivate")}
                  disabled={actionLoading === "deactivate"}
                  className="rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  {actionLoading === "deactivate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => onAction("reactivate")}
                  disabled={actionLoading === "reactivate"}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  {actionLoading === "reactivate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  Reactivate
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 mb-6 border-b border-slate-800" role="tablist">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "attendance", label: "Attendance" },
                { key: "tasks", label: "Tasks" },
                { key: "learning", label: "Learning" },
                { key: "analytics", label: "Analytics" },
                { key: "emails", label: "Emails" },
                { key: "notifications", label: "Notifications" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.key
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <InternOverviewTab
            intern={intern}
            active={activeTab === "overview"}
            stipendEdit={stipendEdit}
            onStipendChange={onStipendChange}
            isSavingStipend={isSavingStipend}
            onSaveStipend={onSaveStipend}
            docVerifications={docVerifications}
            onTriggerVerification={(docType, url) =>
              onTriggerVerification(docType, url)
            }
            onReviewDocument={(id, action) => onReviewDocument(id, action)}
            mentorOptions={mentorOptions}
            mentorSaving={mentorSaving}
            onSaveMentor={onSaveMentor}
          />
          <InternAttendanceTab intern={intern} active={activeTab === "attendance"} />
          <InternTasksTab intern={intern} active={activeTab === "tasks"} />
          <InternLearningTab
            intern={intern}
            active={activeTab === "learning"}
            learningSyncLoading={learningSyncLoading}
            onSyncProgress={onSyncLearningProgress}
            onOpenEnrollModal={() => onEnrollModalOpenChange(true)}
          />
          <InternAnalyticsTab
            active={activeTab === "analytics"}
            analyticsLoading={analyticsLoading}
            perfScores={perfScores}
            perfReview={perfReview}
            reviewLoading={reviewLoading}
            onRegenerateReview={onRegenerateReview}
          />
          <InternEmailsTab intern={intern} active={activeTab === "emails"} />
          <InternNotificationsTab
            intern={intern}
            active={activeTab === "notifications"}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
          />
        </>
      )}

      <EnrollCourseModal
        internId={intern.id}
        internName={intern.name}
        open={enrollModalOpen}
        onClose={() => onEnrollModalOpenChange(false)}
        enrolledCourseIds={
          intern.learningEnrollments?.map((e) => e.courseId) ?? []
        }
        onEnrolled={onEnrolled}
      />
    </>
  );
}
