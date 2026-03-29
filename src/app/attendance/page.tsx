"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, formatDateIST, formatTimeIST } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  mode: string;
}

export default function AttendancePage() {
  const [internName, setInternName] = useState("");
  const [mode, setMode] = useState<"WFH" | "OFFICE">("WFH");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [punching, setPunching] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNeedsOnboarding(false);
      setBlockedMessage(null);
      try {
        const res = await fetch("/api/attendance");
        if (res.status === 401) {
          if (!cancelled) setNeedsOnboarding(true);
          return;
        }
        if (res.status === 403) {
          const err = await res.json();
          if (!cancelled) setBlockedMessage(err.error || "Access denied");
          return;
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load attendance");
        }
        const data = await res.json();
        if (!cancelled) {
          setInternName(data.internName);
          setTodayRecord(data.today);
          setWeekRecords(data.week);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load attendance";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshWeek() {
    const weekRes = await fetch("/api/attendance");
    if (weekRes.ok) {
      const weekData = await weekRes.json();
      setWeekRecords(weekData.week);
      setTodayRecord(weekData.today);
    }
  }

  async function handlePunch(type: "in" | "out") {
    setPunching(true);
    try {
      const apiMode = mode === "OFFICE" ? "Office" : "WFH";
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, mode: apiMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Punch failed");
      }
      const data = await res.json();
      setTodayRecord(data.record);
      toast.success(
        type === "in" ? "Punched in successfully!" : "Punched out successfully!"
      );
      await refreshWeek();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Punch failed";
      toast.error(message);
    } finally {
      setPunching(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
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
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Clock className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Attendance</h1>
            <p className="text-sm text-slate-400 mt-3">
              Please complete onboarding first to use attendance.
            </p>
            <Link
              href="/onboard"
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
        <main className="flex-1 flex items-center justify-center px-4">
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

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
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
              onClick={() => handlePunch("in")}
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
              onClick={() => handlePunch("out")}
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
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                      Punch In
                    </th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                      Punch Out
                    </th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                      Mode
                    </th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                      Hours
                    </th>
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
                      <tr
                        key={rec.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 px-2 text-white">
                          {formatDateIST(rec.date)}
                        </td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
