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
} from "lucide-react";
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

export default function DashboardPage() {
  const [bootState, setBootState] = useState<
    "loading" | "forbidden" | "error" | "ready"
  >("loading");
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stipendEdit, setStipendEdit] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "attendance" | "tasks" | "emails" | "notifications"
  >("overview");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

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
          : action === "send_reminder"
          ? "Task reminder sent!"
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
    }
  }

  const stats = {
    total: interns.length,
    pending: interns.filter((i) => i.status === "PENDING").length,
    active: interns.filter((i) => i.status === "ACTIVE").length,
    completed: interns.filter((i) => i.status === "COMPLETED").length,
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
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedIntern.status === "PENDING" && (
                    <button
                      onClick={() =>
                        handleAction("send_offer", selectedIntern.id)
                      }
                      disabled={
                        actionLoading === "send_offer" ||
                        selectedIntern.stipendPaise === 0
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
                    { key: "emails", label: "Emails" },
                    { key: "notifications", label: "Notifications" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.key === "notifications" && selectedIntern) {
                        loadNotifications(selectedIntern.id);
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
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        onClick={() => saveStipend(selectedIntern.id)}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Display: {formatINR(stipendEdit ?? 0)}/month
                    </p>

                    <h3 className="text-sm font-semibold text-white pt-4">
                      Documents
                    </h3>
                    <div className="space-y-2">
                      {[
                        ["Aadhaar", selectedIntern.aadharUrl],
                        ["PAN Card", selectedIntern.panUrl],
                        ["Photo", selectedIntern.photoUrl],
                      ].map(([label, url]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-400">{label}</span>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-indigo-400 hover:text-blue-300"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-slate-600">Not uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="glass-card p-6">
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
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIntern.attendance.map((rec) => (
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="glass-card p-6">
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
              )}

              {activeTab === "emails" && (
                <div className="glass-card p-6">
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
              )}

              {activeTab === "notifications" && (
                <div className="glass-card p-6">
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
              )}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Intern Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Interns</h2>
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
                {interns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400"
                    >
                      No interns onboarded yet.
                    </td>
                  </tr>
                ) : (
                  interns.map((intern) => (
                    <tr
                      key={intern.id}
                      tabIndex={0}
                      role="button"
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 cursor-pointer transition-colors"
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
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            getStatusColor(intern.status)
                          )}
                        >
                          {intern.status}
                        </span>
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
                  ))
                )}
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
