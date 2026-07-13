"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface BookSessionFormProps {
  slug: string;
  mentorName: string;
}

export function BookSessionForm({ slug, mentorName }: BookSessionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    title: "",
    notes: "",
    date: "",
    startTime: "10:00",
    endTime: "11:00",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requesterName || !form.requesterEmail || !form.title || !form.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startAt = new Date(`${form.date}T${form.startTime}:00+05:30`);
    const endAt = new Date(`${form.date}T${form.endTime}:00+05:30`);

    if (endAt <= startAt) {
      toast.error("End time must be after start time");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/mentors/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: form.requesterName,
          requesterEmail: form.requesterEmail,
          title: form.title,
          notes: form.notes || undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          timezone: "Asia/Kolkata",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Booking request failed");
        return;
      }

      setSubmitted(true);
      toast.success("Booking request sent!");
    } catch {
      toast.error("Failed to submit booking request");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-400">
          {mentorName} will review your session request and get back to you at{" "}
          {form.requesterEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-5 w-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Book a Session</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="book-name" className="block text-xs font-medium text-slate-400 mb-1">
            Your Name *
          </label>
          <input
            id="book-name"
            type="text"
            required
            value={form.requesterName}
            onChange={(e) => setForm((p) => ({ ...p, requesterName: e.target.value }))}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label htmlFor="book-email" className="block text-xs font-medium text-slate-400 mb-1">
            Email *
          </label>
          <input
            id="book-email"
            type="email"
            required
            value={form.requesterEmail}
            onChange={(e) => setForm((p) => ({ ...p, requesterEmail: e.target.value }))}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="book-title" className="block text-xs font-medium text-slate-400 mb-1">
          Session Topic *
        </label>
        <input
          id="book-title"
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          placeholder="e.g. Career guidance, code review"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="book-date" className="block text-xs font-medium text-slate-400 mb-1">
            Date *
          </label>
          <input
            id="book-date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="book-start" className="block text-xs font-medium text-slate-400 mb-1">
            Start (IST)
          </label>
          <input
            id="book-start"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="book-end" className="block text-xs font-medium text-slate-400 mb-1">
            End (IST)
          </label>
          <input
            id="book-end"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="book-notes" className="block text-xs font-medium text-slate-400 mb-1">
          Notes (optional)
        </label>
        <textarea
          id="book-notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-none"
          placeholder="What would you like to discuss?"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Request Session
      </button>
    </form>
  );
}
