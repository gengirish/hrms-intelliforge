"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Inbox,
  Check,
  X,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cn, formatDateIST } from "@/lib/utils";

interface MentorApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: string | null;
  resultingAdminId: string | null;
  createdAt: string;
}

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

function StatusBadge({ status }: { status: MentorApplication["status"] }) {
  const map = {
    PENDING: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: Clock },
    APPROVED: {
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Icon: CheckCircle2,
    },
    REJECTED: { cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", Icon: XCircle },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        cls
      )}
    >
      <Icon className="h-3 w-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function Detail({
  icon: Icon,
  href,
  children,
}: {
  icon: typeof Mail;
  href?: string | null;
  children: React.ReactNode;
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {children}
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
        {content}
      </a>
    );
  }
  return content;
}

export default function MentorApplicationsPage() {
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/mentor-applications${qs}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApplications(data.applications);
    } catch {
      toast.error("Failed to load mentor applications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(app: MentorApplication, action: "approve" | "reject") {
    if (action === "reject" && !confirm(`Reject ${app.name}'s application?`)) return;
    if (
      action === "approve" &&
      !confirm(
        `Approve ${app.name}? This creates a mentor account and emails them a link to set their password.`
      )
    )
      return;

    let reviewNote: string | undefined;
    if (action === "reject") {
      reviewNote = window.prompt("Optional note to include in the decline email:") || undefined;
    }

    setBusyId(app.id);
    try {
      const res = await fetch(`/api/mentor-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(
        action === "approve"
          ? `${app.name} approved — set-password email sent`
          : `${app.name}'s application declined`
      );
      load();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Mentor applications" },
        ]}
      />

      <div className="mt-4 mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
          <Inbox className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Mentor applications</h1>
          <p className="text-sm text-slate-400">
            Review people who applied to mentor and approve them into the directory.
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-900/40 text-slate-400 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-16 text-center text-slate-500">
          No {filter === "ALL" ? "" : filter.toLowerCase()} applications.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{app.name}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  {app.headline && (
                    <p className="mt-0.5 text-sm text-slate-400">{app.headline}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatDateIST(app.createdAt)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Detail icon={Mail} href={`mailto:${app.email}`}>
                  {app.email}
                </Detail>
                {app.phone && <Detail icon={Phone}>{app.phone}</Detail>}
                {typeof app.yearsExperience === "number" && (
                  <span className="text-sm text-slate-400">
                    {app.yearsExperience} yrs experience
                  </span>
                )}
                {app.linkedinUrl && (
                  <Detail icon={ExternalLink} href={app.linkedinUrl}>
                    LinkedIn
                  </Detail>
                )}
                {app.githubUrl && (
                  <Detail icon={ExternalLink} href={app.githubUrl}>
                    GitHub
                  </Detail>
                )}
                {app.portfolioUrl && (
                  <Detail icon={ExternalLink} href={app.portfolioUrl}>
                    Portfolio
                  </Detail>
                )}
              </div>

              {app.expertise.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {app.expertise.map((e) => (
                    <span
                      key={e}
                      className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-300"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}

              {app.bio && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">{app.bio}</p>
              )}

              {app.reviewNote && (
                <p className="mt-3 rounded-lg border-l-2 border-indigo-500/50 bg-slate-900/50 px-3 py-2 text-sm text-slate-400">
                  <span className="text-slate-500">Review note: </span>
                  {app.reviewNote}
                </p>
              )}

              {app.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => review(app, "approve")}
                    disabled={busyId === app.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    {busyId === app.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => review(app, "reject")}
                    disabled={busyId === app.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
