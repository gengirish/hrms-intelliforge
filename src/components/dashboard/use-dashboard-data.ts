"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { EnrollmentRecord as LearningEnrollmentRecord } from "@/components/learning/enroll-course-modal";
import type {
  BootState,
  DashboardTab,
  Intern,
  NotificationRecord,
  PerformanceScoreRecord,
  PerformanceReviewRecord,
  DocVerification,
  MentorOption,
  AttendanceSummary,
  DashboardStats,
} from "./types";

export function useDashboardData() {
  const [bootState, setBootState] = useState<BootState>("loading");
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stipendEdit, setStipendEdit] = useState<number | null>(null);
  const [isSavingStipend, setIsSavingStipend] = useState(false);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joinFrom, setJoinFrom] = useState("");
  const [joinTo, setJoinTo] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [learningSyncLoading, setLearningSyncLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [perfScores, setPerfScores] = useState<PerformanceScoreRecord[]>([]);
  const [perfReview, setPerfReview] = useState<PerformanceReviewRecord | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [docVerifications, setDocVerifications] = useState<DocVerification[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [mentorSaving, setMentorSaving] = useState(false);

  const loadAttendanceOverview = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch("/api/dashboard/attendance");
      if (res.ok) {
        const data = await res.json();
        setAttendanceSummary(data.summary);
      }
    } catch {
      /* non-critical */
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setBootState("forbidden");
          return;
        }
        if (!res.ok) {
          toast.error("Failed to load dashboard");
          setBootState("error");
          return;
        }
        const data = await res.json();
        setInterns(data.interns);
        setBootState("ready");
        loadAttendanceOverview();
      } catch {
        if (!cancelled) {
          toast.error("Failed to load dashboard");
          setBootState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttendanceOverview]);

  useEffect(() => {
    if (bootState !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org/admins");
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setMentorOptions(data.admins ?? []);
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootState]);

  const refreshInternList = useCallback(async () => {
    const listRes = await fetch("/api/dashboard");
    if (listRes.ok) {
      const data = await listRes.json();
      setInterns(data.interns);
    }
  }, []);

  const loadInternDetail = useCallback(async (internId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/intern?id=${internId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSelectedIntern(data);
      setStipendEdit(data.stipendPaise);
      setActiveTab("overview");
      try {
        const verifyRes = await fetch(`/api/documents/verify?internId=${internId}`);
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          setDocVerifications(verifyData.verifications ?? []);
        }
      } catch {
        /* non-critical */
      }
    } catch {
      toast.error("Failed to load intern details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async (internId: string) => {
    setNotificationsLoading(true);
    try {
      const res = await fetch(`/api/notifications?internId=${internId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setNotifications(data.notifications);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadDocVerifications = useCallback(async (internId: string) => {
    try {
      const res = await fetch(`/api/documents/verify?internId=${internId}`);
      if (res.ok) {
        const data = await res.json();
        setDocVerifications(data.verifications ?? []);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  const syncLearningProgress = useCallback(async (internId: string, silent = false) => {
    setLearningSyncLoading(true);
    try {
      const res = await fetch("/api/learning/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync Learning progress");
      }
      setSelectedIntern((prev) =>
        prev && prev.id === internId
          ? { ...prev, learningEnrollments: data.enrollments ?? prev.learningEnrollments }
          : prev
      );
      if (!silent) {
        toast.success(
          data.synced > 0
            ? `Synced progress for ${data.synced} course${data.synced === 1 ? "" : "s"}`
            : "Learning progress is up to date"
        );
      }
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : "Failed to sync Learning progress");
      }
    } finally {
      setLearningSyncLoading(false);
    }
  }, []);

  const triggerVerification = useCallback(
    async (internId: string, documentType: "AADHAAR" | "PAN", documentUrl: string) => {
      try {
        const res = await fetch("/api/documents/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internId, documentType, documentUrl }),
        });
        if (res.ok) {
          toast.success("Verification triggered");
          await loadDocVerifications(internId);
        } else {
          toast.error("Verification failed");
        }
      } catch {
        toast.error("Verification failed");
      }
    },
    [loadDocVerifications]
  );

  const reviewDocument = useCallback(
    async (verificationId: string, action: "APPROVE" | "REJECT", internId: string) => {
      try {
        const res = await fetch("/api/documents/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationId, action }),
        });
        if (res.ok) {
          toast.success(action === "APPROVE" ? "Document approved" : "Document rejected");
          await loadDocVerifications(internId);
        }
      } catch {
        toast.error("Review failed");
      }
    },
    [loadDocVerifications]
  );

  const loadAnalytics = useCallback(async (internId: string) => {
    setAnalyticsLoading(true);
    try {
      const [scoresRes, reviewRes] = await Promise.all([
        fetch(`/api/analytics/scores?internId=${internId}`),
        fetch(`/api/analytics/review?internId=${internId}`),
      ]);
      if (scoresRes.ok) {
        const data = await scoresRes.json();
        setPerfScores(data.scores ?? []);
      }
      if (reviewRes.ok) {
        const data = await reviewRes.json();
        setPerfReview(data.review ?? null);
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const regenerateReview = useCallback(async (internId: string) => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/analytics/review?internId=${internId}&regenerate=true`);
      if (res.ok) {
        const data = await res.json();
        setPerfReview(data.review ?? null);
        toast.success("Review regenerated");
      }
    } catch {
      toast.error("Failed to regenerate review");
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const sendForEsign = useCallback(
    async (internId: string) => {
      setActionLoading("send_esign");
      try {
        const res = await fetch("/api/offer/esign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "E-sign request failed");
        }
        toast.success("Offer sent for electronic signing!");
        await loadInternDetail(internId);
        await refreshInternList();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "E-sign request failed";
        toast.error(message);
      } finally {
        setActionLoading(null);
      }
    },
    [loadInternDetail, refreshInternList]
  );

  const handleAction = useCallback(
    async (action: string, internId: string) => {
      setActionLoading(action);
      try {
        const res = await fetch("/api/dashboard/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, internId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Action failed");
        }
        toast.success(
          action === "send_offer"
            ? "Offer letter sent!"
            : action === "approve_offer"
              ? "Offer approved — intern is now active!"
              : action === "send_reminder"
                ? "Task reminder sent!"
                : action === "deactivate"
                  ? "Intern deactivated"
                  : action === "reactivate"
                    ? "Intern reactivated"
                    : "Completion certificate sent!"
        );
        await loadInternDetail(internId);
        await refreshInternList();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Action failed";
        toast.error(message);
      } finally {
        setActionLoading(null);
      }
    },
    [loadInternDetail, refreshInternList]
  );

  const saveStipend = useCallback(
    async (internId: string) => {
      if (stipendEdit === null) return;
      setIsSavingStipend(true);
      try {
        const res = await fetch("/api/dashboard/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_stipend",
            internId,
            stipendPaise: stipendEdit,
          }),
        });
        if (!res.ok) throw new Error("Failed to save");
        toast.success("Stipend updated!");
        await loadInternDetail(internId);
      } catch {
        toast.error("Failed to update stipend");
      } finally {
        setIsSavingStipend(false);
      }
    },
    [stipendEdit, loadInternDetail]
  );

  const saveInternMentor = useCallback(
    async (mentorId: string | null) => {
      if (!selectedIntern) return;
      setMentorSaving(true);
      try {
        const res = await fetch("/api/dashboard/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_mentor",
            internId: selectedIntern.id,
            mentorId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Could not update mentor");
        }
        toast.success(mentorId ? "Mentor assigned" : "Mentor unassigned");
        await loadInternDetail(selectedIntern.id);
        await refreshInternList();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not update mentor");
      } finally {
        setMentorSaving(false);
      }
    },
    [selectedIntern, loadInternDetail, refreshInternList]
  );

  const handleTabChange = useCallback(
    (tab: DashboardTab) => {
      setActiveTab(tab);
      if (!selectedIntern) return;
      if (tab === "notifications") {
        loadNotifications(selectedIntern.id);
      }
      if (tab === "analytics") {
        loadAnalytics(selectedIntern.id);
      }
      if (tab === "learning") {
        void syncLearningProgress(selectedIntern.id, true);
      }
    },
    [selectedIntern, loadNotifications, loadAnalytics, syncLearningProgress]
  );

  const handleEnrolled = useCallback((enrollment: LearningEnrollmentRecord) => {
    setSelectedIntern((prev) => {
      if (!prev) return prev;
      const existing = prev.learningEnrollments ?? [];
      const without = existing.filter((e) => e.courseId !== enrollment.courseId);
      return {
        ...prev,
        learningEnrollments: [enrollment, ...without],
      };
    });
  }, []);

  const stats: DashboardStats = useMemo(() => {
    const activeInterns = interns.filter((i) => !i.deactivated);
    return {
      total: activeInterns.length,
      pending: activeInterns.filter((i) => i.status === "PENDING").length,
      offered: activeInterns.filter((i) => i.status === "OFFERED").length,
      active: activeInterns.filter((i) => i.status === "ACTIVE").length,
      completed: activeInterns.filter((i) => i.status === "COMPLETED").length,
      deactivated: interns.filter((i) => i.deactivated).length,
    };
  }, [interns]);

  const filteredInterns = useMemo(() => {
    let list = showDeactivated ? interns : interns.filter((i) => !i.deactivated);

    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      list = list.filter(
        (intern) =>
          intern.name.toLowerCase().includes(q) ||
          intern.email.toLowerCase().includes(q) ||
          intern.role.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "DEACTIVATED") {
        list = list.filter((intern) => intern.deactivated);
      } else {
        list = list.filter(
          (intern) => intern.status === statusFilter && !intern.deactivated
        );
      }
    }

    if (joinFrom) {
      const from = new Date(joinFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((intern) => new Date(intern.createdAt) >= from);
    }

    if (joinTo) {
      const to = new Date(joinTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((intern) => new Date(intern.createdAt) <= to);
    }

    return list;
  }, [interns, showDeactivated, nameFilter, statusFilter, joinFrom, joinTo]);

  return {
    bootState,
    interns,
    selectedIntern,
    setSelectedIntern,
    detailLoading,
    actionLoading,
    stipendEdit,
    setStipendEdit,
    isSavingStipend,
    showDeactivated,
    setShowDeactivated,
    nameFilter,
    setNameFilter,
    statusFilter,
    setStatusFilter,
    joinFrom,
    setJoinFrom,
    joinTo,
    setJoinTo,
    attendanceSummary,
    attendanceLoading,
    activeTab,
    enrollModalOpen,
    setEnrollModalOpen,
    learningSyncLoading,
    notifications,
    notificationsLoading,
    perfScores,
    perfReview,
    analyticsLoading,
    reviewLoading,
    docVerifications,
    mentorOptions,
    mentorSaving,
    stats,
    filteredInterns,
    loadInternDetail,
    syncLearningProgress,
    triggerVerification,
    reviewDocument,
    regenerateReview,
    sendForEsign,
    handleAction,
    saveStipend,
    saveInternMentor,
    handleTabChange,
    handleEnrolled,
  };
}
