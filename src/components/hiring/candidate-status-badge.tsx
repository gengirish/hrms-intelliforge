import { cn } from "@/lib/utils";

type CandidateStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEWED"
  | "REJECTED"
  | "HIRED"
  | "PENDING"
  | "COMPLETED";

interface CandidateStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<CandidateStatus, string> = {
  APPLIED: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  SHORTLISTED: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  INTERVIEWED: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  COMPLETED: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  HIRED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-300 border-red-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
};

const UNKNOWN_STYLE = "bg-slate-500/10 text-slate-300 border-slate-500/20";

function isKnownStatus(status: string): status is CandidateStatus {
  return status in STATUS_STYLES;
}

function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function CandidateStatusBadge({
  status,
  className,
}: CandidateStatusBadgeProps) {
  const normalized = (status ?? "").toUpperCase();
  const known = isKnownStatus(normalized);
  const style = known ? STATUS_STYLES[normalized] : UNKNOWN_STYLE;
  const label = known ? capitalize(normalized) : "—";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
