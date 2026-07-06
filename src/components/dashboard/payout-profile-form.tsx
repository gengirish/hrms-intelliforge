"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  payoutProfileSchema,
  type PayoutProfileInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

export interface PayoutProfileFormProps {
  internId: string;
  onSaved?: () => void;
  className?: string;
}

export function PayoutProfileForm({
  internId,
  onSaved,
  className,
}: PayoutProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PayoutProfileInput>({
    resolver: zodResolver(payoutProfileSchema),
    defaultValues: {
      payoutMethod: "upi",
      beneficiaryName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
    },
  });

  const payoutMethod = watch("payoutMethod");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/intern/${internId}/payout-profile`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.form) {
          reset(data.form);
        }
      } catch {
        // non-blocking — admin can still enter fresh details
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [internId, reset]);

  async function onSubmit(values: PayoutProfileInput) {
    try {
      const res = await fetch(
        `/api/dashboard/intern/${internId}/payout-profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.issues?.[0]?.message || data.error || "Failed to save payout profile";
        toast.error(msg);
        return;
      }
      if (data.form) reset(data.form);
      toast.success("Payout details saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save payout details");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-4", className)}
    >
      <div>
        <span className="block text-sm text-slate-400 mb-2">Payout method</span>
        <div className="flex gap-2">
          <label
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              payoutMethod === "upi"
                ? "border-indigo-500 bg-indigo-900/30 text-white"
                : "border-slate-700 text-slate-400 hover:border-slate-600"
            )}
          >
            <input
              type="radio"
              value="upi"
              className="sr-only"
              {...register("payoutMethod")}
            />
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            UPI
          </label>
          <label
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              payoutMethod === "bank"
                ? "border-indigo-500 bg-indigo-900/30 text-white"
                : "border-slate-700 text-slate-400 hover:border-slate-600"
            )}
          >
            <input
              type="radio"
              value="bank"
              className="sr-only"
              {...register("payoutMethod")}
            />
            <Landmark className="h-4 w-4" aria-hidden="true" />
            Bank account
          </label>
        </div>
      </div>

      {payoutMethod === "bank" && (
        <div>
          <label htmlFor="beneficiaryName" className="block text-sm text-slate-400 mb-1">
            Beneficiary name (as per bank)
          </label>
          <input
            id="beneficiaryName"
            type="text"
            autoComplete="name"
            {...register("beneficiaryName")}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
            placeholder="Full name on account"
          />
          {errors.beneficiaryName && (
            <p className="text-xs text-red-400 mt-1">{errors.beneficiaryName.message}</p>
          )}
        </div>
      )}

      {payoutMethod === "upi" ? (
        <div>
          <label htmlFor="upiId" className="block text-sm text-slate-400 mb-1">
            UPI ID (VPA)
          </label>
          <input
            id="upiId"
            type="text"
            inputMode="email"
            autoComplete="off"
            {...register("upiId")}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
            placeholder="name@upi"
          />
          {errors.upiId && (
            <p className="text-xs text-red-400 mt-1">{errors.upiId.message}</p>
          )}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="accountNumber" className="block text-sm text-slate-400 mb-1">
              Account number
            </label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              {...register("accountNumber")}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none font-mono"
              placeholder="1234567890"
            />
            {errors.accountNumber && (
              <p className="text-xs text-red-400 mt-1">{errors.accountNumber.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="ifsc" className="block text-sm text-slate-400 mb-1">
              IFSC code
            </label>
            <input
              id="ifsc"
              type="text"
              autoComplete="off"
              {...register("ifsc")}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none font-mono uppercase"
              placeholder="HDFC0001234"
            />
            {errors.ifsc && (
              <p className="text-xs text-red-400 mt-1">{errors.ifsc.message}</p>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-slate-500">
        Used for RazorpayX stipend payouts. Changing details clears cached Razorpay
        fund accounts so the next batch re-validates recipients.
      </p>

      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save payout details
      </button>
    </form>
  );
}
