"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  LogIn,
  LogOut,
  Home,
  Building2,
  Loader2,
  CheckCircle2,
  Users,
  CalendarDays,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, formatDateIST, formatTimeIST } from "@/lib/utils";
import { captureEvent } from "@/lib/posthog";

/* ---------- shared types ---------- */

interface AttendanceRecord {
  id: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  mode: string;
  dailyStatus: string | null;
}

interface AdminOverviewEntry {
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

interface AdminWeekRecord {
  id: string;
  internId: string;
  internName: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  mode: string;
  dailyStatus: string | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  punchedOut: number;
  withStatus: number;
}

/* ---------- admin view ---------- */

function AdminAttendanceView({
  adminName,
  overview,
  summary,
  weekRecords,
  onRefresh,
  refreshing,
}: {
  adminName: string;
  overview: AdminOverviewEntry[];
  summary: AttendanceSummary;
  weekRecords: AdminWeekRecord[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"today" | "week">("today");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent">("all");

  const now = new Date();
  const istDate = now.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const filteredOverview = useMemo(() => {
    let list = overview;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q)
      );
    }
    if (filterStatus === "present") list = list.filter((e) => e.today);
    if (filterStatus === "absent") list = list.filter((e) => !e.today);
    return list;
  }, [overview, search, filterStatus]);

  const filteredWeek = useMemo(() => {
    if (!search) return weekRecords;
    const q = search.toLowerCase();
    return weekRecords.filter((r) => r.internName.toLowerCase().includes(q));
  }, [weekRecords, search]);

  return (
    <main id="main-content" className="flex-1 mx-auto max-w-5xl w-full px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance</h1>
          <p className="mt-1 text-slate-400">
            Welcome, {adminName} &middot; Admin View
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">{istDate}</p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Interns", value: summary.total, icon: Users, color: "text-indigo-400" },
          { label: "Present", value: summary.present, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Absent", value: summary.absent, icon: Clock, color: "text-red-400" },
          { label: "Status Updates", value: summary.withStatus, icon: FileText, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search/filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {(["today", "week"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors capitalize",
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {tab === "today" ? (
                <CalendarDays className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {tab === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search intern..."
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors w-48"
            />
          </div>
          {activeTab === "today" && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-1.5 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
            >
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          )}
        </div>
      </div>

      {/* Today's overview table */}
      {activeTab === "today" && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
              Today&apos;s Attendance
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400 font-medium">{summary.present} present</span>
              <span className="text-red-400 font-medium">{summary.absent} absent</span>
            </div>
          </div>
          {filteredOverview.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {search || filterStatus !== "all"
                ? "No interns match your filters."
                : "No active interns to track."}
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
                  {filteredOverview.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {entry.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white text-xs truncate">{entry.name}</p>
                            <p className="text-xs text-slate-500 truncate">{entry.role}</p>
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
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              entry.today.mode === "WFH"
                                ? "bg-indigo-500/10 text-indigo-400"
                                : "bg-purple-500/10 text-purple-400"
                            )}
                          >
                            {entry.today.mode === "WFH" ? (
                              <Home className="h-3 w-3" />
                            ) : (
                              <Building2 className="h-3 w-3" />
                            )}
                            {entry.today.mode}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-64">
                        {entry.today?.dailyStatus ? (
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                            <span
                              className="text-slate-300 line-clamp-2"
                              title={entry.today.dailyStatus}
                            >
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
      )}

      {/* Week view table */}
      {activeTab === "week" && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              This Week&apos;s Records
            </h2>
          </div>
          {filteredWeek.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {search ? "No records match your search." : "No attendance records this week."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Intern</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Punch In</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Punch Out</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Mode</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Hours</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWeek.map((rec) => {
                    const hours =
                      rec.punchIn && rec.punchOut
                        ? (
                            (new Date(rec.punchOut).getTime() -
                              new Date(rec.punchIn).getTime()) /
                            3600000
                          ).toFixed(1)
                        : "—";
                    return (
                      <tr key={rec.id} className="border-b border-slate-800 last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {rec.internName.charAt(0)}
                            </div>
                            <span className="text-white text-xs font-medium truncate">
                              {rec.internName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white text-xs">
                          {formatDateIST(rec.date)}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {rec.punchIn ? formatTimeIST(rec.punchIn) : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {rec.punchOut ? formatTimeIST(rec.punchOut) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              rec.mode === "WFH"
                                ? "bg-indigo-500/10 text-indigo-400"
                                : "bg-purple-500/10 text-purple-400"
                            )}
                          >
                            {rec.mode === "WFH" ? (
                              <Home className="h-3 w-3" />
                            ) : (
                              <Building2 className="h-3 w-3" />
                            )}
                            {rec.mode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">{hours}h</td>
                        <td className="py-3 px-4 text-slate-400 text-xs max-w-48 truncate" title={rec.dailyStatus || ""}>
                          {rec.dailyStatus || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ---------- intern view ---------- */

function InternAttendanceView({
  internName,
  todayRecord,
  weekRecords,
  onPunch,
  punching,
  onSaveStatus,
  savingStatus,
  statusText,
  onStatusChange,
}: {
  internName: string;
  todayRecord: AttendanceRecord | null;
  weekRecords: AttendanceRecord[];
  onPunch: (type: "in" | "out") => void;
  punching: boolean;
  onSaveStatus: () => void;
  savingStatus: boolean;
  statusText: string;
  onStatusChange: (text: string) => void;
}) {
  const [mode, setMode] = useState<"WFH" | "OFFICE">("WFH");

  const now = new Date();
  const istDate = now.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const istTime = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main id="main-content" className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance</h1>
          <p className="mt-1 text-slate-400">Welcome, {internName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">{istDate}</p>
          <p className="text-lg font-mono text-white">{istTime}</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Today&apos;s Attendance</h2>
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("WFH")}
              aria-pressed={mode === "WFH"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "WFH"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Home className="h-3.5 w-3.5" />
              WFH
            </button>
            <button
              type="button"
              onClick={() => setMode("OFFICE")}
              aria-pressed={mode === "OFFICE"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "OFFICE"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Office
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onPunch("in")}
            disabled={punching || !!todayRecord?.punchIn}
            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            {todayRecord?.punchIn ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Punched In at {formatTimeIST(todayRecord.punchIn)}
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Punch In
              </>
            )}
          </button>

          <button
            onClick={() => onPunch("out")}
            disabled={punching || !todayRecord?.punchIn || !!todayRecord?.punchOut}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            {todayRecord?.punchOut ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Punched Out at {formatTimeIST(todayRecord.punchOut)}
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5" />
                Punch Out
              </>
            )}
          </button>
        </div>
      </div>

      {todayRecord?.punchIn && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Daily Status Update
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            What are you working on today? This is visible to your admin.
          </p>
          <textarea
            value={statusText}
            onChange={(e) => onStatusChange(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Working on API integration, reviewing docs, attending team meeting..."
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-sm resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">
              {statusText.length}/500
              {todayRecord.dailyStatus && (
                <span className="ml-2 text-emerald-500">Saved</span>
              )}
            </span>
            <button
              onClick={onSaveStatus}
              disabled={savingStatus || !statusText.trim()}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-1.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
            >
              {savingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Save Status
            </button>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          This Week&apos;s Attendance
        </h2>

        {weekRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No attendance records this week.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Punch In</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Punch Out</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Mode</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Hours</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {weekRecords.map((rec) => {
                  const hours =
                    rec.punchIn && rec.punchOut
                      ? (
                          (new Date(rec.punchOut).getTime() -
                            new Date(rec.punchIn).getTime()) /
                          3600000
                        ).toFixed(1)
                      : "—";
                  return (
                    <tr key={rec.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-3 px-2 text-white">{formatDateIST(rec.date)}</td>
                      <td className="py-3 px-2 text-slate-300">
                        {rec.punchIn ? formatTimeIST(rec.punchIn) : "—"}
                      </td>
                      <td className="py-3 px-2 text-slate-300">
                        {rec.punchOut ? formatTimeIST(rec.punchOut) : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            rec.mode === "WFH"
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "bg-purple-500/10 text-purple-400"
                          )}
                        >
                          {rec.mode === "WFH" ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Building2 className="h-3 w-3" />
                          )}
                          {rec.mode}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-300">{hours}h</td>
                      <td
                        className="py-3 px-2 text-slate-400 text-xs max-w-48 truncate"
                        title={rec.dailyStatus || ""}
                      >
                        {rec.dailyStatus || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- main page component ---------- */

export default function AttendancePage() {
  const [userRole, setUserRole] = useState<"admin" | "intern" | null>(null);

  // Intern state
  const [internName, setInternName] = useState("");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
  const [punching, setPunching] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Admin state
  const [adminName, setAdminName] = useState("");
  const [overview, setOverview] = useState<AdminOverviewEntry[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    absent: 0,
    punchedOut: 0,
    withStatus: 0,
  });
  const [adminWeekRecords, setAdminWeekRecords] = useState<AdminWeekRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/attendance");
      if (res.status === 401) {
        setNeedsOnboarding(true);
        return;
      }
      if (res.status === 403) {
        const err = await res.json();
        setBlockedMessage(err.error || "Access denied");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load attendance");
      }
      const data = await res.json();

      if (data.role === "admin") {
        setUserRole("admin");
        setAdminName(data.adminName || "Admin");
        setOverview(data.overview);
        setSummary(data.summary);
        setAdminWeekRecords(data.weekRecords);
      } else {
        setUserRole("intern");
        setInternName(data.internName);
        setTodayRecord(data.today);
        setWeekRecords(data.week);
        if (data.today?.dailyStatus) setStatusText(data.today.dailyStatus);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load attendance";
      toast.error(message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNeedsOnboarding(false);
      setBlockedMessage(null);
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handlePunch(type: "in" | "out") {
    setPunching(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, mode: "WFH" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Punch failed");
      }
      const data = await res.json();
      setTodayRecord(data.record);
      captureEvent("attendance_punch", { type, mode: "WFH" });
      toast.success(
        type === "in" ? "Punched in successfully!" : "Punched out successfully!"
      );
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Punch failed";
      toast.error(message);
    } finally {
      setPunching(false);
    }
  }

  async function handleSaveStatus() {
    setSavingStatus(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "status", dailyStatus: statusText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save status");
      }
      const data = await res.json();
      setTodayRecord(data.record);
      toast.success("Daily status saved!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save status";
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading attendance…</p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Clock className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Attendance</h1>
            <p className="text-sm text-slate-400 mt-3">
              Please complete onboarding first to use attendance.
            </p>
            <Link
              href="/intern-onboarding"
              className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 font-semibold text-white transition-all"
            >
              Go to onboarding
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Clock className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Attendance</h1>
            <p className="text-sm text-slate-400 mt-3">{blockedMessage}</p>
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

      {userRole === "admin" ? (
        <AdminAttendanceView
          adminName={adminName}
          overview={overview}
          summary={summary}
          weekRecords={adminWeekRecords}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      ) : (
        <InternAttendanceView
          internName={internName}
          todayRecord={todayRecord}
          weekRecords={weekRecords}
          onPunch={handlePunch}
          punching={punching}
          onSaveStatus={handleSaveStatus}
          savingStatus={savingStatus}
          statusText={statusText}
          onStatusChange={setStatusText}
        />
      )}

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
