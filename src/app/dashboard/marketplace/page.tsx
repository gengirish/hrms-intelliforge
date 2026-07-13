"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Wallet, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { cn, formatINR, formatDateIST } from "@/lib/utils";

interface MarketplaceTransaction {
  id: string;
  recipientType: string;
  recipientId: string;
  grossAmountPaise: number;
  platformFeePaise: number;
  netAmountPaise: number;
  feeBps: number;
  status: string;
  createdAt: string;
}

interface Totals {
  count: number;
  completedCount: number;
  grossAmountPaise: number;
  platformFeePaise: number;
  netAmountPaise: number;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-900/50 text-emerald-400";
    case "PENDING":
      return "bg-yellow-900/50 text-yellow-400";
    case "FAILED":
      return "bg-red-900/50 text-red-400";
    default:
      return "bg-slate-700 text-slate-400";
  }
}

export default function MarketplacePage() {
  const [bootState, setBootState] = useState<
    "loading" | "forbidden" | "error" | "ready"
  >("loading");
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>(
    []
  );
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/marketplace/transactions");
      if (res.status === 401 || res.status === 403) {
        setBootState("forbidden");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to load platform fee transactions");
        setBootState("error");
        return;
      }
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotals(data.totals ?? null);
      setBootState("ready");
    }
    void load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Platform fees" },
          ]}
        />
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-7 w-7 text-indigo-400" aria-hidden="true" />
            Platform fees
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Platform fees collected on stipend payouts through your workspace.
          </p>
        </div>

        <DashboardSubnav className="mb-6" />

        {bootState === "loading" && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        )}

        {bootState === "forbidden" && (
          <div className="glass-card p-8 text-center text-slate-400">
            Only full workspace admins can view platform fee transactions.
          </div>
        )}

        {bootState === "ready" && totals && (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="glass-card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Gross payouts
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatINR(totals.grossAmountPaise)}
                </p>
              </div>
              <div className="glass-card p-5 ring-1 ring-indigo-500/30">
                <p className="text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Platform fees
                </p>
                <p className="mt-2 text-2xl font-bold text-indigo-200">
                  {formatINR(totals.platformFeePaise)}
                </p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Net to recipients
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatINR(totals.netAmountPaise)}
                </p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400">
                No platform fee transactions yet. Fees are recorded when stipend
                batches are processed.
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-left text-slate-400">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Recipient</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Gross
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Fee
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Net
                        </th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-slate-800/60 hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3 text-slate-300">
                            {formatDateIST(tx.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-300 capitalize">
                            {tx.recipientType}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            {formatINR(tx.grossAmountPaise)}
                          </td>
                          <td className="px-4 py-3 text-right text-indigo-300">
                            {formatINR(tx.platformFeePaise)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            {formatINR(tx.netAmountPaise)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                statusBadgeClass(tx.status)
                              )}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
