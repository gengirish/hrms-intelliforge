"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import {
  AdminAttendanceView,
  type AdminOverviewEntry,
  type AdminWeekRecord,
  type AttendanceSummary,
} from "@/components/dashboard/admin-attendance-view";

export default function DashboardAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [overview, setOverview] = useState<AdminOverviewEntry[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    absent: 0,
    punchedOut: 0,
    withStatus: 0,
  });
  const [weekRecords, setWeekRecords] = useState<AdminWeekRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const res = await fetch("/api/attendance");
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to load attendance");
    }
    const data = await res.json();
    if (data.role !== "admin") {
      setForbidden(true);
      return;
    }
    setAdminName(data.adminName || "Admin");
    setOverview(data.overview ?? []);
    setSummary(data.summary ?? summary);
    setWeekRecords(data.weekRecords ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadData();
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load attendance");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Clock className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin access required</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in with an admin account to view team attendance.
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
      <main id="main-content" className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <Breadcrumbs className="mb-4" />
        <DashboardSubnav className="mb-6" />
        <AdminAttendanceView
          adminName={adminName}
          overview={overview}
          summary={summary}
          weekRecords={weekRecords}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
