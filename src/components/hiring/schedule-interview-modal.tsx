"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays } from "date-fns";
import { Calendar, Download, Loader2, Trash2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateIST, formatTimeIST } from "@/lib/utils";
import { downloadIcsFile } from "@/lib/ics";
import {
  defaultInterviewEnd,
  formatIstDateInput,
  istDateTimeToUtc,
  SCHEDULING_TIMEZONE,
} from "@/lib/scheduling";

interface ScheduledEventRow {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  meetLink: string | null;
  status: string;
}

interface ScheduleInterviewModalProps {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
}

export function ScheduleInterviewModal({
  open,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
}: ScheduleInterviewModalProps) {
  const defaultStart = addDays(new Date(), 1);
  defaultStart.setMinutes(0, 0, 0);

  const [date, setDate] = useState(formatIstDateInput(defaultStart));
  const [time, setTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<ScheduledEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch(
        `/api/scheduling/events?candidateId=${encodeURIComponent(candidateId)}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(
        (data.events as ScheduledEventRow[]).filter((e) => e.status !== "CANCELLED")
      );
      setGoogleConfigured(Boolean(data.googleConfigured));
    } catch {
      toast.error("Failed to load scheduled interviews");
    } finally {
      setEventsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (!open) return;
    void loadEvents();
  }, [open, loadEvents]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const start = istDateTimeToUtc(date, time);
      const end = defaultInterviewEnd(start, durationMinutes);

      const res = await fetch("/api/scheduling/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          description: description.trim() || undefined,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          timezone: SCHEDULING_TIMEZONE,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to schedule interview");
        return;
      }

      if (!data.googleConfigured && data.icsContent) {
        downloadIcsFile(
          data.icsContent,
          `interview-${candidateName.replace(/\s+/g, "-").toLowerCase()}`
        );
        toast.success("Interview saved — calendar invite downloaded (.ics)");
      } else if (data.event?.meetLink) {
        toast.success("Interview scheduled with Google Meet link");
      } else {
        toast.success("Interview scheduled");
      }

      setDescription("");
      await loadEvents();
    } catch {
      toast.error("Failed to schedule interview");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelEvent(eventId: string) {
    if (!window.confirm("Cancel this scheduled interview?")) return;
    setCancellingId(eventId);
    try {
      const res = await fetch(`/api/scheduling/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel interview");
        return;
      }
      toast.success("Interview cancelled");
      await loadEvents();
    } catch {
      toast.error("Failed to cancel interview");
    } finally {
      setCancellingId(null);
    }
  }

  const defaultTitle = `Interview: ${candidateName} — ${jobTitle}`;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        aria-label="Close schedule interview dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
        className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 mx-4 rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2
              id="schedule-interview-title"
              className="text-base font-semibold text-white flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              Schedule Interview
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {candidateName} · {candidateEmail}
            </p>
            {!googleConfigured && (
              <p className="text-[11px] text-amber-400/90 mt-2 flex items-center gap-1">
                <Download className="h-3 w-3" aria-hidden="true" />
                Google Calendar not configured — an .ics file will download after scheduling
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-300">{defaultTitle}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="interview-date"
                className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
              >
                Date (IST)
              </label>
              <input
                id="interview-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="interview-time"
                className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
              >
                Time (IST)
              </label>
              <input
                id="interview-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="interview-duration"
              className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
            >
              Duration
            </label>
            <select
              id="interview-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="interview-notes"
              className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
            >
              Notes (optional)
            </label>
            <textarea
              id="interview-notes"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda, panel members, prep materials…"
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Calendar className="h-4 w-4" aria-hidden="true" />
              )}
              Schedule
            </button>
          </div>
        </form>

        <section className="border-t border-slate-800 px-5 py-4">
          <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-3">
            Upcoming interviews
          </h3>
          {eventsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">
              No interviews scheduled yet.
            </p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{ev.title}</p>
                    <p className="text-xs text-slate-400">
                      {formatDateIST(ev.startAt)} · {formatTimeIST(ev.startAt)} IST
                    </p>
                    {ev.meetLink && (
                      <a
                        href={ev.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1"
                      >
                        <Video className="h-3 w-3" aria-hidden="true" />
                        Join Meet
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCancelEvent(ev.id)}
                    disabled={cancellingId === ev.id}
                    aria-label="Cancel interview"
                    className={cn(
                      "shrink-0 rounded-md p-1.5 text-red-400 hover:bg-red-500/10 transition-colors",
                      cancellingId === ev.id && "opacity-50"
                    )}
                  >
                    {cancellingId === ev.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
