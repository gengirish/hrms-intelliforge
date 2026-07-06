"use client";

import {
  Loader2,
  IndianRupee,
  Save,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { cn, formatINR, formatDateIST } from "@/lib/utils";
import { InternPayoutSection } from "./intern-payout-section";
import type { Intern, DocVerification, MentorOption } from "./types";

interface InternOverviewTabProps {
  intern: Intern;
  active: boolean;
  stipendEdit: number | null;
  onStipendChange: (value: number) => void;
  isSavingStipend: boolean;
  onSaveStipend: () => void;
  docVerifications: DocVerification[];
  onTriggerVerification: (
    documentType: "AADHAAR" | "PAN",
    documentUrl: string
  ) => void;
  onReviewDocument: (
    verificationId: string,
    action: "APPROVE" | "REJECT"
  ) => void;
  mentorOptions: MentorOption[];
  mentorSaving: boolean;
  onSaveMentor: (mentorId: string | null) => void;
}

export function InternOverviewTab({
  intern,
  active,
  stipendEdit,
  onStipendChange,
  isSavingStipend,
  onSaveStipend,
  docVerifications,
  onTriggerVerification,
  onReviewDocument,
  mentorOptions,
  mentorSaving,
  onSaveMentor,
}: InternOverviewTabProps) {
  return (
    <div
      id="panel-overview"
      role="tabpanel"
      aria-labelledby="tab-overview"
      hidden={!active}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white mb-3">Personal Info</h3>
        {[
          ["Phone", intern.phone],
          ["College", intern.college],
          ["Branch", intern.branch],
          ["Year", intern.year],
          ["Start Date", formatDateIST(intern.startDate)],
          ["Duration", `${intern.durationWeeks} weeks`],
          ["Email (HR)", "hr@intelliforge.tech"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="text-white">{value}</span>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Stipend (in paise)</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 flex-1">
            <IndianRupee className="h-4 w-4 text-slate-400" />
            <input
              type="number"
              value={stipendEdit ?? ""}
              onChange={(e) => onStipendChange(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onSaveStipend}
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

        <h3 className="text-sm font-semibold text-white pt-4">Documents</h3>
        <div className="space-y-3">
          {(
            [
              ["Aadhaar", intern.aadharUrl, "AADHAAR"],
              ["PAN Card", intern.panUrl, "PAN"],
              ["Photo", intern.photoUrl, null],
            ] as const
          ).map(([label, url, docType]) => {
            const verification = docType
              ? docVerifications.find((v) => v.documentType === docType)
              : null;
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    {label}
                    {verification && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          verification.status === "VERIFIED"
                            ? "bg-emerald-900/50 text-emerald-400"
                            : verification.status === "MISMATCH" ||
                                verification.status === "REJECTED"
                              ? "bg-red-900/50 text-red-400"
                              : verification.status === "PROCESSING"
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-slate-700 text-slate-300"
                        )}
                      >
                        {verification.status === "VERIFIED" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : verification.status === "MISMATCH" ||
                          verification.status === "REJECTED" ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : (
                          <ShieldQuestion className="h-3 w-3" />
                        )}
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
                        onClick={() =>
                          onTriggerVerification(
                            docType as "AADHAAR" | "PAN",
                            url as string
                          )
                        }
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
                {verification &&
                  verification.status !== "VERIFIED" &&
                  verification.status !== "REJECTED" && (
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        onClick={() =>
                          onReviewDocument(verification.id, "APPROVE")
                        }
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          onReviewDocument(verification.id, "REJECT")
                        }
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Reject
                      </button>
                      {verification.reviewNote && (
                        <span
                          className="text-xs text-slate-500 truncate max-w-48"
                          title={verification.reviewNote}
                        >
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

      <div className="glass-card p-6 space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-white">Mentor assignment</h3>
        <p className="text-xs text-slate-400">
          Pick a workspace teammate with a mentor or admin login. They receive
          mentor-facing emails (for example weekly progress feedback).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center max-w-xl">
          <select
            className="w-full sm:flex-1 rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none disabled:opacity-50"
            value={intern.mentorId ?? ""}
            disabled={mentorSaving}
            onChange={(e) => {
              const v = e.target.value;
              void onSaveMentor(v === "" ? null : v);
            }}
            aria-busy={mentorSaving}
          >
            <option value="">No mentor assigned</option>
            {mentorOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.name ?? m.email) + " · " + m.email}
                {m.role === "MENTOR" ? " (mentor role)" : ""}
              </option>
            ))}
          </select>
          {mentorSaving ? (
            <Loader2
              className="h-5 w-5 shrink-0 animate-spin text-indigo-400"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <InternPayoutSection internId={intern.id} className="md:col-span-2" />
    </div>
  );
}
