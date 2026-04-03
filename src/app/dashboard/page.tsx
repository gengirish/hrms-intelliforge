"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Users,
  Clock,
  CheckCircle2,
  Bell,
  Award,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Eye,
  IndianRupee,
  Save,
  Send,
  MessageSquare,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  ShieldQuestion,
  CalendarDays,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, formatINR, formatDateIST, formatTimeIST, getStatusColor } from "@/lib/utils";

interface Intern {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  role: string;
  startDate: string;
  durationWeeks: number;
  stipendPaise: number;
  mentorId: string | null;
  aadharUrl: string | null;
  panUrl: string | null;
  photoUrl: string | null;
  agentmailInboxId?: string | null;
  agentmailAddress?: string | null;
  whatsappOptIn?: boolean;
  status: string;
  deactivated?: boolean;
  deactivatedAt?: string | null;
  acceptedAt: string | null;
  createdAt: string;
  attendance?: AttendanceRecord[];
  tasks?: TaskRecord[];
  messages?: EmailMessage[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  mode: string;
}

interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  hours: number;
  week: string;
}

interface EmailMessage {
  messageId: string;
  subject: string;
  from: string;
  createdAt: string;
  text: string;
}

interface NotificationRecord {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  type: string;
  subject: string | null;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

interface PerformanceScoreRecord {
  id: string;
  weekLabel: string;
  attendanceScore: number;
  taskScore: number;
  consistencyScore: number;
  overallScore: number;
  riskLevel: string;
}

interface PerformanceReviewRecord {
  id: string;
  summary: string;
  recommendation: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

interface AttendanceOverview {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  today: {
    id: string;
    punchIn: string | null;
    punchOut: string | null;
    mode: string;
    dailyStatus: string | null;
  } | null;
}

interface DocVerification {
  id: string;
  documentType: string;
  status: string;
  extractedName: string | null;
  extractedNumber: string | null;
  nameMatch: boolean | null;
  formatValid: boolean | null;
  reviewNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [bootState, setBootState] = useState<
    "loading" | "forbidden" | "error" | "ready"
  >("loading");
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stipendEdit, setStipendEdit] = useState<number | null>(null);
  const [isSavingStipend, setIsSavingStipend] = useState(false);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    total: number; present: number; absent: number; punchedOut: number; withStatus: number;
  } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "attendance" | "tasks" | "emails" | "notifications" | "analytics"
  >("overview");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [perfScores, setPerfScores] = useState<PerformanceScoreRecord[]>([]);
  const [perfReview, setPerfReview] = useState<PerformanceReviewRecord | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [docVerifications, setDocVerifications] = useState<DocVerification[]>([]);

  async function loadAttendanceOverview() {
    setAttendanceLoading(true);
    try {
      const res = await fetch("/api/dashboard/attendance");
      if (res.ok) {
        const data = await res.json();
        setAttendanceOverview(data.overview);
        setAttendanceSummary(data.summary);
      }
    } catch {
      /* non-critical */
    } finally {
      setAttendanceLoading(false);
    }
  }

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
  }, []);

  async function loadInternDetail(internId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/intern?id=${internId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSelectedIntern(data);
      setStipendEdit(data.stipendPaise);
      setActiveTab("overview");
      loadDocVerifications(internId);
    } catch {
      toast.error("Failed to load intern details");
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadNotifications(internId: string) {
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
  }

  async function loadDocVerifications(internId: string) {
    try {
      const res = await fetch(`/api/documents/verify?internId=${internId}`);
      if (res.ok) {
        const data = await res.json();
        setDocVerifications(data.verifications ?? []);
      }
    } catch {
      /* non-critical */
    }
  }

  async function triggerVerification(internId: string, documentType: "AADHAAR" | "PAN", documentUrl: string) {
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
  }

  async function reviewDocument(verificationId: string, action: "APPROVE" | "REJECT", internId: string) {
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
  }

  async function loadAnalytics(internId: string) {
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
  }

  async function regenerateReview(internId: string) {
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
  }

  async function handleAction(action: string, internId: string) {
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
      const listRes = await fetch("/api/dashboard");
      if (listRes.ok) {
        const data = await listRes.json();
        setInterns(data.interns);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function saveStipend(internId: string) {
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
  }

  const activeInterns = interns.filter((i) => !i.deactivated);
  const stats = {
    total: activeInterns.length,
    pending: activeInterns.filter((i) => i.status === "PENDING").length,
    offered: activeInterns.filter((i) => i.status === "OFFERED").length,
    active: activeInterns.filter((i) => i.status === "ACTIVE").length,
    completed: activeInterns.filter((i) => i.status === "COMPLETED").length,
    deactivated: interns.filter((i) => i.deactivated).length,
  };

  if (bootState === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (bootState === "forbidden") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Users className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin access required</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in with an account that has admin privileges.
            </p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (bootState === "error") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Unable to load dashboard</h1>
            <p className="text-sm text-slate-400 mt-2">
              Please refresh the page or try again later.
            </p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  // Intern Detail View
  if (selectedIntern) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
          <button
            onClick={() => setSelectedIntern(null)}
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
              {/* Intern Header */}
              <div className="glass-card p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xl font-bold text-white">
                      {selectedIntern.name.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">
                        {selectedIntern.name}
                      </h1>
                      <p className="text-sm text-slate-400">
                        {selectedIntern.role} &middot; {selectedIntern.college}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedIntern.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        getStatusColor(selectedIntern.status)
                      )}
                    >
                      {selectedIntern.status}
                    </span>
                    {perfScores.length > 0 && (() => {
                      const latest = perfScores[perfScores.length - 1];
                      const riskColors: Record<string, string> = {
                        LOW: "bg-emerald-900/50 text-emerald-400",
                        MEDIUM: "bg-yellow-900/50 text-yellow-400",
                        HIGH: "bg-orange-900/50 text-orange-400",
                        CRITICAL: "bg-red-900/50 text-red-400",
                      };
                      return (
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", riskColors[latest.riskLevel] ?? riskColors.LOW)}>
                          {latest.riskLevel === "HIGH" || latest.riskLevel === "CRITICAL" ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {latest.riskLevel} Risk
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedIntern.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleAction("send_offer", selectedIntern.id)
                        }
                        disabled={
                          actionLoading === "send_offer" ||
                          selectedIntern.stipendPaise === 0
                        }
                        title={selectedIntern.stipendPaise === 0 ? "Set the stipend first before sending the offer" : undefined}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                      >
                        {actionLoading === "send_offer" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Offer Letter
                      </button>
                      {selectedIntern.stipendPaise === 0 && (
                        <span className="text-xs text-amber-400">Set stipend first →</span>
                      )}
                    </div>
                  )}
                  {selectedIntern.status === "OFFERED" && (
                    <button
                      onClick={() =>
                        handleAction("approve_offer", selectedIntern.id)
                      }
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
                  {selectedIntern.status === "ACTIVE" && (
                    <>
                      <button
                        onClick={() =>
                          handleAction("send_reminder", selectedIntern.id)
                        }
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
                        onClick={() =>
                          handleAction("mark_complete", selectedIntern.id)
                        }
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
                  {!selectedIntern.deactivated ? (
                    <button
                      onClick={() =>
                        handleAction("deactivate", selectedIntern.id)
                      }
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
                      onClick={() =>
                        handleAction("reactivate", selectedIntern.id)
                      }
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

              {/* Tabs */}
              <div
                className="flex gap-1 mb-6 border-b border-slate-800"
                role="tablist"
              >
                {(
                  [
                    { key: "overview", label: "Overview" },
                    { key: "attendance", label: "Attendance" },
                    { key: "tasks", label: "Tasks" },
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
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.key === "notifications" && selectedIntern) {
                        loadNotifications(selectedIntern.id);
                      }
                      if (tab.key === "analytics" && selectedIntern) {
                        loadAnalytics(selectedIntern.id);
                      }
                    }}
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

              {/* Tab Content */}
              <div
                id="panel-overview"
                role="tabpanel"
                aria-labelledby="tab-overview"
                hidden={activeTab !== "overview"}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                  {/* Personal Info */}
                  <div className="glass-card p-6 space-y-3">
                    <h3 className="text-sm font-semibold text-white mb-3">
                      Personal Info
                    </h3>
                    {[
                      ["Phone", selectedIntern.phone],
                      ["College", selectedIntern.college],
                      ["Branch", selectedIntern.branch],
                      ["Year", selectedIntern.year],
                      ["Start Date", formatDateIST(selectedIntern.startDate)],
                      ["Duration", `${selectedIntern.durationWeeks} weeks`],
                      ["Email (HR)", "hr@intelliforge.tech"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-white">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stipend Editor */}
                  <div className="glass-card p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white">
                      Stipend (in paise)
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 flex-1">
                        <IndianRupee className="h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          value={stipendEdit ?? ""}
                          onChange={(e) =>
                            setStipendEdit(Number(e.target.value))
                          }
                          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => saveStipend(selectedIntern.id)}
                        disabled={isSavingStipend}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2 text-sm font-semibold text-white transition-colors inline-flex items-center gap-2"
                      >
                        {isSavingStipend ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Display: {formatINR(stipendEdit ?? 0)}/month
                    </p>

                    <h3 className="text-sm font-semibold text-white pt-4">
                      Documents
                    </h3>
                    <div className="space-y-3">
                      {([
                        ["Aadhaar", selectedIntern.aadharUrl, "AADHAAR"],
                        ["PAN Card", selectedIntern.panUrl, "PAN"],
                        ["Photo", selectedIntern.photoUrl, null],
                      ] as const).map(([label, url, docType]) => {
                        const verification = docType
                          ? docVerifications.find((v) => v.documentType === docType)
                          : null;
                        return (
                          <div key={label} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-2">
                                {label}
                                {verification && (
                                  <span className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                    verification.status === "VERIFIED" ? "bg-emerald-900/50 text-emerald-400" :
                                    verification.status === "MISMATCH" || verification.status === "REJECTED" ? "bg-red-900/50 text-red-400" :
                                    verification.status === "PROCESSING" ? "bg-yellow-900/50 text-yellow-400" :
                                    "bg-slate-700 text-slate-300"
                                  )}>
                                    {verification.status === "VERIFIED" ? <ShieldCheck className="h-3 w-3" /> :
                                     verification.status === "MISMATCH" || verification.status === "REJECTED" ? <ShieldAlert className="h-3 w-3" /> :
                                     <ShieldQuestion className="h-3 w-3" />}
                                    {verification.status}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {url ? (
                                  <a
                                    href={url as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-indigo-400 hover:text-blue-300 text-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </a>
                                ) : (
                                  <span className="text-slate-600 text-xs">Not uploaded</span>
                                )}
                                {url && docType && !verification && (
                                  <button
                                    onClick={() => triggerVerification(selectedIntern.id, docType as "AADHAAR" | "PAN", url as string)}
                                    className="text-xs text-amber-400 hover:text-amber-300"
                                  >
                                    Verify
                                  </button>
                                )}
                              </div>
                            </div>
                            {verification && verification.status !== "VERIFIED" && verification.status !== "REJECTED" && (
                              <div className="flex items-center gap-2 pl-2">
                                <button
                                  onClick={() => reviewDocument(verification.id, "APPROVE", selectedIntern.id)}
                                  className="text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => reviewDocument(verification.id, "REJECT", selectedIntern.id)}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Reject
                                </button>
                                {verification.reviewNote && (
                                  <span className="text-xs text-slate-500 truncate max-w-48" title={verification.reviewNote}>
                                    {verification.reviewNote}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
              </div>

              <div
                id="panel-attendance"
                role="tabpanel"
                aria-labelledby="tab-attendance"
                hidden={activeTab !== "attendance"}
                className="glass-card p-6"
              >
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Attendance Records
                  </h3>
                  {!selectedIntern.attendance ||
                  selectedIntern.attendance.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No attendance records yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-2 text-slate-400 font-medium">
                              Date
                            </th>
                            <th className="text-left py-3 px-2 text-slate-400 font-medium">
                              In
                            </th>
                            <th className="text-left py-3 px-2 text-slate-400 font-medium">
                              Out
                            </th>
                            <th className="text-left py-3 px-2 text-slate-400 font-medium">
                              Mode
                            </th>
                            <th className="text-left py-3 px-2 text-slate-400 font-medium">
                              Daily Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIntern.attendance.map((rec: AttendanceRecord & { dailyStatus?: string | null }) => (
                            <tr
                              key={rec.id}
                              className="border-b border-slate-800 last:border-0"
                            >
                              <td className="py-2 px-2 text-white">
                                {formatDateIST(rec.date)}
                              </td>
                              <td className="py-2 px-2 text-slate-300">
                                {rec.punchIn
                                  ? formatTimeIST(rec.punchIn)
                                  : "—"}
                              </td>
                              <td className="py-2 px-2 text-slate-300">
                                {rec.punchOut
                                  ? formatTimeIST(rec.punchOut)
                                  : "—"}
                              </td>
                              <td className="py-2 px-2 text-slate-300">
                                {rec.mode}
                              </td>
                              <td className="py-2 px-2 text-slate-400 text-xs max-w-48 truncate" title={rec.dailyStatus || ""}>
                                {rec.dailyStatus || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>

              <div
                id="panel-tasks"
                role="tabpanel"
                aria-labelledby="tab-tasks"
                hidden={activeTab !== "tasks"}
                className="glass-card p-6"
              >
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Task Log
                  </h3>
                  {!selectedIntern.tasks ||
                  selectedIntern.tasks.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No tasks logged yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedIntern.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">
                                {task.title}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                  getStatusColor(task.status)
                                )}
                              >
                                {task.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {task.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {task.hours}h &middot; Week {task.week}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div
                id="panel-analytics"
                role="tabpanel"
                aria-labelledby="tab-analytics"
                hidden={activeTab !== "analytics"}
                className="space-y-6"
              >
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  </div>
                ) : perfScores.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <BarChart3 className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No performance scores computed yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Scores are computed daily via cron job.</p>
                  </div>
                ) : (
                  <>
                    {/* Score Trend Chart */}
                    <div className="glass-card p-6">
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        Performance Trend
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={perfScores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="weekLabel" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                              labelStyle={{ color: "#e2e8f0" }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="overallScore" name="Overall" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8" }} />
                            <Line type="monotone" dataKey="attendanceScore" name="Attendance" stroke="#34d399" strokeWidth={1.5} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="taskScore" name="Tasks" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Score Breakdown Bar Chart */}
                    <div className="glass-card p-6">
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-400" />
                        Latest Score Breakdown
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[perfScores[perfScores.length - 1]]} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis type="category" dataKey="weekLabel" tick={{ fill: "#94a3b8", fontSize: 12 }} width={80} />
                            <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                            <Bar dataKey="attendanceScore" name="Attendance" fill="#34d399" barSize={20} />
                            <Bar dataKey="taskScore" name="Tasks" fill="#fbbf24" barSize={20} />
                            <Bar dataKey="consistencyScore" name="Consistency" fill="#818cf8" barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* AI Review Card */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          AI Performance Review
                        </h3>
                        <button
                          onClick={() => selectedIntern && regenerateReview(selectedIntern.id)}
                          disabled={reviewLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                        >
                          {reviewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Regenerate
                        </button>
                      </div>
                      {perfReview ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-300 leading-relaxed">{perfReview.summary}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Recommendation:</span>
                            <span className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              perfReview.recommendation === "CONVERT_FULL_TIME" ? "bg-emerald-100 text-emerald-800" :
                              perfReview.recommendation === "EXTEND" ? "bg-blue-100 text-blue-800" :
                              perfReview.recommendation === "ON_TRACK" ? "bg-slate-100 text-slate-800" :
                              "bg-orange-100 text-orange-800"
                            )}>
                              {perfReview.recommendation.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Generated {formatDateIST(perfReview.generatedAt)}
                            {" "}({formatDateIST(perfReview.periodStart)} — {formatDateIST(perfReview.periodEnd)})
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No review generated yet. Click &ldquo;Regenerate&rdquo; to create one.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div
                id="panel-emails"
                role="tabpanel"
                aria-labelledby="tab-emails"
                hidden={activeTab !== "emails"}
                className="glass-card p-6"
              >
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Email thread
                  </h3>
                  {!selectedIntern.messages ||
                  selectedIntern.messages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      All HR email goes from{" "}
                      <span className="text-slate-300">hr@intelliforge.tech</span>{" "}
                      to this intern&apos;s address. View replies in the AgentMail
                      console for the shared HR inbox.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedIntern.messages.map((msg) => (
                        <div
                          key={msg.messageId}
                          className="p-3 rounded-lg bg-slate-900/50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {msg.subject}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDateIST(msg.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            From: {msg.from}
                          </p>
                          {msg.text && (
                            <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                              {msg.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div
                id="panel-notifications"
                role="tabpanel"
                aria-labelledby="tab-notifications"
                hidden={activeTab !== "notifications"}
                className="glass-card p-6"
              >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">
                      Notification History
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedIntern?.whatsappOptIn && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <MessageSquare className="h-3 w-3" />
                          WhatsApp enabled
                        </span>
                      )}
                    </div>
                  </div>
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No notifications sent yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
                        >
                          <div
                            className={cn(
                              "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              notif.channel === "WHATSAPP"
                                ? "bg-emerald-900/50 text-emerald-400"
                                : "bg-indigo-900/50 text-indigo-400"
                            )}
                          >
                            {notif.channel === "WHATSAPP" ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white truncate">
                                {notif.type.replace(/_/g, " ")}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                                  notif.status === "READ"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : notif.status === "DELIVERED"
                                      ? "bg-blue-100 text-blue-800"
                                      : notif.status === "SENT"
                                        ? "bg-slate-100 text-slate-800"
                                        : notif.status === "FAILED"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                )}
                              >
                                {notif.status}
                              </span>
                            </div>
                            {notif.subject && (
                              <p className="text-xs text-slate-400 truncate">{notif.subject}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              {notif.sentAt
                                ? formatDateIST(notif.sentAt)
                                : formatDateIST(notif.createdAt)}
                              {notif.readAt && (
                                <span className="ml-2 text-emerald-500">
                                  Read {formatDateIST(notif.readAt)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  // Intern List View
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Manage interns, send offers, and track progress.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            {
              label: "Total Interns",
              value: stats.total,
              icon: Users,
              color: "text-indigo-400",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: Clock,
              color: "text-yellow-400",
            },
            {
              label: "Offered",
              value: stats.offered,
              icon: Send,
              color: "text-blue-400",
            },
            {
              label: "Active",
              value: stats.active,
              icon: CheckCircle2,
              color: "text-emerald-400",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: Award,
              color: "text-purple-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">
                  {stat.label}
                </span>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Today's Attendance Overview */}
        <div className="glass-card overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
              Today&apos;s Attendance
            </h2>
            {attendanceSummary && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-400 font-medium">{attendanceSummary.present} present</span>
                <span className="text-red-400 font-medium">{attendanceSummary.absent} absent</span>
                <span className="text-slate-400">{attendanceSummary.withStatus} status updates</span>
              </div>
            )}
          </div>
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : attendanceOverview.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No active/offered interns to track attendance for.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Intern</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Punch In</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Punch Out</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Mode</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Daily Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceOverview.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white">
                            {entry.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white text-xs">{entry.name}</p>
                            <p className="text-xs text-slate-500">{entry.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {entry.today ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-900/50 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-900/50 text-red-400">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {entry.today?.punchIn ? formatTimeIST(entry.today.punchIn) : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {entry.today?.punchOut ? formatTimeIST(entry.today.punchOut) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {entry.today ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            entry.today.mode === "WFH"
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "bg-purple-500/10 text-purple-400"
                          )}>
                            {entry.today.mode}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-64">
                        {entry.today?.dailyStatus ? (
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                            <span className="text-slate-300 line-clamp-2" title={entry.today.dailyStatus}>
                              {entry.today.dailyStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Intern Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Interns</h2>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDeactivated}
                onChange={(e) => setShowDeactivated(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              Show deactivated
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = showDeactivated
                    ? interns
                    : interns.filter((i) => !i.deactivated);
                  if (filtered.length === 0) return (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400"
                    >
                      {showDeactivated ? "No interns onboarded yet." : "No active interns. Toggle \"Show deactivated\" to see all."}
                    </td>
                  </tr>
                  );
                  return filtered.map((intern) => (
                    <tr
                      key={intern.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${intern.name}`}
                      className={cn(
                        "border-b border-slate-800 last:border-0 hover:bg-slate-800/30 cursor-pointer transition-colors",
                        intern.deactivated && "opacity-50"
                      )}
                      onClick={() => loadInternDetail(intern.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          loadInternDetail(intern.id);
                        }
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white">
                            {intern.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {intern.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {intern.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {intern.role}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              getStatusColor(intern.status)
                            )}
                          >
                            {intern.status}
                          </span>
                          {intern.deactivated && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-900/50 text-red-400">
                              Deactivated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                        {intern.email}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                        {formatDateIST(intern.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
