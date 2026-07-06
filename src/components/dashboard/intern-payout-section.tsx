"use client";

import { useState, useEffect } from "react";
import { IndianRupee, CheckCircle2, AlertCircle } from "lucide-react";
import { PayoutProfileForm } from "@/components/dashboard/payout-profile-form";
import { cn } from "@/lib/utils";

export interface InternPayoutSectionProps {
  internId: string;
  className?: string;
}

export function InternPayoutSection({ internId, className }: InternPayoutSectionProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/intern/${internId}/payout-profile`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setConfigured(!!data.configured);
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [internId]);

  return (
    <section className={cn("glass-card p-6 space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Stipend payout profile
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Bank or UPI details for monthly stipend disbursement via RazorpayX.
          </p>
        </div>
        {configured !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
              configured
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-amber-900/50 text-amber-300"
            )}
          >
            {configured ? (
              <>
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                On file
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Not set
              </>
            )}
          </span>
        )}
      </div>

      <PayoutProfileForm
        internId={internId}
        onSaved={() => setConfigured(true)}
      />
    </section>
  );
}
