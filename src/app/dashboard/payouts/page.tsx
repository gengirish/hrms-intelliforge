"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  IndianRupee,
  Loader2,
  Plus,
  Play,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { cn, formatINR, formatDateIST } from "@/lib/utils";

interface PayoutRow {
  id: string;
  internId: string;
  amountPaise: number;
  status: string;
  failureReason: string | null;
}

interface PayoutBatch {
  id: string;
  month: string;
  status: string;
  totalPaise: number;
  processedAt: string | null;
  createdAt: string;
  payouts: PayoutRow[];
  _count?: { payouts: number };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PROCESSED":
      return "bg-emerald-900/50 text-emerald-400";
    case "PROCESSING":
      return "bg-blue-900/50 text-blue-400";
    case "FAILED":
      return "bg-red-900/50 text-red-400";
    case "CANCELLED":
      return "bg-slate-700 text-slate-400";
    default:
      return "bg-yellow-900/50 text-yellow-400";
  }
}

export default function PayoutsPage() {
  const [bootState, setBootState] = useState<
    "loading" | "forbidden" | "error" | "ready"
  >("loading");
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadBatches() {
    const res = await fetch("/api/payouts/batches");
    if (res.status === 401 || res.status === 403) {
      setBootState("forbidden");
      return false;
    }
    if (!res.ok) {
      toast.error("Failed to load payout batches");
      setBootState("error");
      return false;
    }
    const data = await res.json();
    setBatches(data.batches ?? []);
    setBootState("ready");
    return true;
  }

  useEffect(() => {
    void loadBatches();
  }, []);

  async function createBatch() {
    setCreating(true);
    try {
      const res = await fetch("/api/payouts/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create batch");
      }
      toast.success(
        data.skippedNoProfile > 0
          ? `Batch created (${data.skippedNoProfile} intern(s) skipped — no payout profile)`
          : "Stipend batch created"
      );
      await loadBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setCreating(false);
    }
  }

  async function processBatch(batchId: string) {
    setProcessingId(batchId);
    try {
      const res = await fetch(`/api/payouts/batches/${batchId}/process`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to process batch");
      }
      const failed = data.failedCount ?? 0;
      toast.success(
        failed > 0
          ? `Batch submitted; ${failed} payout(s) failed immediately`
          : "Payouts submitted to RazorpayX"
      );
      await loadBatches();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process batch"
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (bootState === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (bootState === "forbidden") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <IndianRupee className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin access required</h1>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (bootState === "error") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <p className="text-white font-semibold">Unable to load payouts</p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <Breadcrumbs className="mb-4" />
        <DashboardSubnav className="mb-6" />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Stipend Payouts</h1>
            <p className="mt-1 text-slate-400">
              Monthly RazorpayX batches for active interns with bank/UPI profiles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadBatches()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void createBatch()}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create batch
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Month
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                    Payouts
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium" />
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No payout batches yet. Create one for the current month.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="py-3 px-4 text-white font-medium">
                        {batch.month}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            statusBadgeClass(batch.status)
                          )}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatINR(batch.totalPaise)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                        {batch._count?.payouts ?? batch.payouts?.length ?? 0}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                        {formatDateIST(batch.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {batch.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => void processBatch(batch.id)}
                            disabled={processingId === batch.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            {processingId === batch.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Process
                          </button>
                        )}
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
    </div>
  );
}
