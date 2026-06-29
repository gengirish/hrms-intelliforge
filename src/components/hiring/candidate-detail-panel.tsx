"use client";

import { useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { cn, formatDateIST } from "@/lib/utils";
import {
  CANDIDATE_STATUS_OPTIONS,
  canConvertCandidate,
  getConvertDisabledReason,
  normalizeCandidateStatus,
} from "@/lib/hiring/candidate-status";
import { CandidateStatusBadge } from "./candidate-status-badge";
import { ResumePreview } from "./resume-preview";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  coverNote: string | null;
  interviewScore: number | null;
  interviewStatus: string;
  reportUrl: string | null;
  convertedToIntern: boolean;
  createdAt: string;
}

interface CandidateDetailPanelProps {
  candidate: Candidate;
  jobId: string;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
  onStatusChange: (newStatus: string) => Promise<void> | void;
  onConvert: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onContact: (subject: string, message: string) => Promise<void>;
  onSchedule?: () => void;
  busy?: {
    status?: boolean;
    convert?: boolean;
    delete?: boolean;
    contact?: boolean;
  };
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function CandidateDetailPanel({
  candidate,
  jobId,
  jobTitle,
  open,
  onClose,
  onStatusChange,
  onConvert,
  onDelete,
  onContact,
  onSchedule,
  busy,
}: CandidateDetailPanelProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Lock background scroll while panel is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const placeholderSubject = `Re: Your application for ${jobTitle}`;
  const normalizedStatus = normalizeCandidateStatus(candidate.interviewStatus);
  const canConvert = canConvertCandidate(
    candidate.interviewStatus,
    candidate.convertedToIntern
  );
  const convertDisabledReason = getConvertDisabledReason(
    candidate.interviewStatus,
    candidate.convertedToIntern
  );

  async function handleContactSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedSubject = subject.trim() || placeholderSubject;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    await onContact(trimmedSubject, trimmedMessage);
    setSubject("");
    setMessage("");
    setContactOpen(false);
  }

  function handleDeleteClick() {
    const confirmed = window.confirm(
      "Delete this candidate? This cannot be undone."
    );
    if (!confirmed) return;
    void onDelete();
  }

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        aria-label="Close candidate details"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-panel-title"
        data-job-id={jobId}
        data-candidate-id={candidate.id}
        className={cn(
          "fixed right-0 top-0 h-screen w-full sm:max-w-[640px]",
          "bg-slate-950 border-l border-slate-800",
          "overflow-y-auto",
          "animate-in slide-in-from-right duration-200",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="candidate-panel-title"
              className="text-base font-semibold text-white truncate"
            >
              {candidate.name}
            </h2>
            <p className="text-xs text-slate-400 truncate">{candidate.email}</p>
            <div className="mt-2">
              <CandidateStatusBadge status={candidate.interviewStatus} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 px-5 py-5 space-y-4">
          {/* Quick info grid */}
          <section className="glass-card p-4">
            <h3 className="sr-only">Quick info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  Phone
                </p>
                {candidate.phone ? (
                  <a
                    href={`tel:${candidate.phone}`}
                    className="mt-1 block text-sm text-white hover:text-brand-300 transition-colors truncate"
                  >
                    {candidate.phone}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">—</p>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  Applied
                </p>
                <p className="mt-1 text-sm text-white">
                  {formatDateIST(candidate.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                  <Award className="h-3 w-3" aria-hidden="true" />
                  Interview score
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold",
                    getScoreColor(candidate.interviewScore)
                  )}
                >
                  {candidate.interviewScore !== null
                    ? `${candidate.interviewScore}%`
                    : "—"}
                </p>
              </div>

              {candidate.reportUrl && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    Report
                  </p>
                  <a
                    href={candidate.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                  >
                    View report
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Status changer */}
          <section className="glass-card p-4">
            <label
              htmlFor="candidate-status"
              className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2"
            >
              Status
            </label>
            <div className="flex items-center gap-2">
              <select
                id="candidate-status"
                value={
                  CANDIDATE_STATUS_OPTIONS.includes(
                    normalizedStatus as (typeof CANDIDATE_STATUS_OPTIONS)[number]
                  )
                    ? normalizedStatus
                    : ""
                }
                disabled={busy?.status}
                onChange={(event) => {
                  const next = event.target.value;
                  if (!next) return;
                  void onStatusChange(next);
                }}
                className="flex-1 rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white focus:border-brand-500 outline-none transition-colors disabled:opacity-50"
              >
                {!CANDIDATE_STATUS_OPTIONS.includes(
                  normalizedStatus as (typeof CANDIDATE_STATUS_OPTIONS)[number]
                ) && (
                  <option value="" disabled>
                    {candidate.interviewStatus || "—"}
                  </option>
                )}
                {CANDIDATE_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0) + option.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              {busy?.status && (
                <Loader2
                  className="h-4 w-4 animate-spin text-brand-400 shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
          </section>

          {/* Links section */}
          {(candidate.resumeUrl ||
            candidate.githubUrl ||
            candidate.portfolioUrl) && (
            <section className="glass-card p-4">
              <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-3">
                Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.resumeUrl && (
                  <a
                    href={candidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Resume
                  </a>
                )}
                {candidate.githubUrl && (
                  <a
                    href={candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    GitHub
                  </a>
                )}
                {candidate.portfolioUrl && (
                  <a
                    href={candidate.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Cover note */}
          {candidate.coverNote && (
            <section className="glass-card p-4">
              <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
                Cover note
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                {candidate.coverNote}
              </p>
            </section>
          )}

          {/* Resume preview */}
          {candidate.resumeUrl && (
            <section className="glass-card p-4">
              <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-3">
                Resume preview
              </h3>
              <ResumePreview
                url={candidate.resumeUrl}
                candidateName={candidate.name}
              />
            </section>
          )}

          {/* Contact form */}
          <section className="glass-card p-4">
            <button
              type="button"
              onClick={() => setContactOpen((prev) => !prev)}
              aria-expanded={contactOpen}
              aria-controls="candidate-contact-form"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {contactOpen ? "Hide contact form" : "Contact candidate"}
            </button>

            {contactOpen && (
              <form
                id="candidate-contact-form"
                onSubmit={handleContactSubmit}
                className="mt-4 space-y-3"
              >
                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
                  >
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    placeholder={placeholderSubject}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 outline-none transition-colors resize-none"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={busy?.contact}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    {busy?.contact ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Send
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-5 py-4">
          {onSchedule && (
            <button
              type="button"
              onClick={onSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors mr-auto"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Schedule interview
            </button>
          )}
          <button
            type="button"
            onClick={() => void onConvert()}
            disabled={!canConvert || busy?.convert}
            title={convertDisabledReason}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            {busy?.convert ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {candidate.convertedToIntern
              ? "Already converted"
              : "Convert to intern"}
          </button>

          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={candidate.convertedToIntern || busy?.delete}
            className="inline-flex items-center gap-1.5 rounded-lg bg-transparent border border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {busy?.delete ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Delete candidate
          </button>
        </footer>
      </aside>
    </div>
  );
}
