"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ListChecks,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  PlayCircle,
  Trash2,
  Send,
  Lock,
} from "lucide-react";
import { z } from "zod";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, getStatusColor } from "@/lib/utils";
import { dailyPlanItemSchema } from "@/lib/validations";

interface DailyTaskItem {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface DailyPlan {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: string | null;
  items: DailyTaskItem[];
}

const addTaskSchema = dailyPlanItemSchema;
type AddTaskForm = z.infer<typeof addTaskSchema>;

const STATUS_CYCLE: DailyTaskItem["status"][] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

function nextStatus(current: DailyTaskItem["status"]): DailyTaskItem["status"] {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function statusIcon(status: DailyTaskItem["status"]) {
  switch (status) {
    case "DONE":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "IN_PROGRESS":
      return <PlayCircle className="h-4 w-4 text-indigo-400" />;
    default:
      return <Circle className="h-4 w-4 text-slate-400" />;
  }
}

export default function DailyPlanPage() {
  const [internName, setInternName] = useState("");
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const isSubmitted = plan?.status === "SUBMITTED";

  const istDate = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTaskForm>({ resolver: zodResolver(addTaskSchema) });

  async function loadPlan() {
    const res = await fetch("/api/daily-plan", { cache: "no-store" });
    if (res.status === 401) {
      setNeedsOnboarding(true);
      return;
    }
    if (res.status === 403) {
      const err = await res.json();
      setBlockedMessage(err.error || "Access denied");
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to load daily plan");
    }
    const data = await res.json();
    setInternName(data.internName);
    setPlan(data.plan);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNeedsOnboarding(false);
      setBlockedMessage(null);
      try {
        await loadPlan();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load daily plan";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAddTask(data: AddTaskForm) {
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          title: data.title,
          description: data.description ?? "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add task");
      }
      const result = await res.json();
      setPlan(result.plan);
      reset();
      setShowForm(false);
      toast.success("Task added to today's plan");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  }

  async function toggleTaskStatus(item: DailyTaskItem) {
    setBusyItemId(item.id);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          itemId: item.id,
          status: nextStatus(item.status),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update task");
      }
      const result = await res.json();
      setPlan(result.plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    } finally {
      setBusyItemId(null);
    }
  }

  async function deleteTask(itemId: string) {
    setBusyItemId(itemId);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", itemId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete task");
      }
      const result = await res.json();
      setPlan(result.plan);
      toast.success("Task removed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setBusyItemId(null);
    }
  }

  async function submitPlan() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit plan");
      }
      const result = await res.json();
      setPlan(result.plan);
      toast.success("Daily plan submitted!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submit failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const items = plan?.items ?? [];
  const doneCount = items.filter((i) => i.status === "DONE").length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading daily plan…</p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full text-center">
            <ListChecks className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Daily Task Plan</h1>
            <p className="text-sm text-slate-400 mt-3">
              Please complete onboarding first to plan your daily tasks.
            </p>
            <Link
              href="/intern-onboarding"
              className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 font-semibold text-white transition-all"
            >
              Go to onboarding
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full text-center">
            <ListChecks className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Daily Task Plan</h1>
            <p className="text-sm text-slate-400 mt-3">{blockedMessage}</p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 mx-auto max-w-3xl w-full px-4 py-12"
      >
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Daily Task Plan</h1>
            <p className="mt-1 text-slate-400">
              {internName} &middot; {istDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Completed</p>
                <p className="text-lg font-bold text-white">
                  {doneCount}/{items.length}
                </p>
              </div>
            )}
            {!isSubmitted && (
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            )}
          </div>
        </div>

        {isSubmitted && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3 border border-emerald-500/20">
            <Lock className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Plan submitted for today
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                You can still mark tasks complete as you finish them.
              </p>
            </div>
          </div>
        )}

        {showForm && !isSubmitted && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              New task for today
            </h2>
            <form onSubmit={handleSubmit(onAddTask)} className="space-y-4">
              <div>
                <label
                  htmlFor="daily-plan-title"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Task
                </label>
                <input
                  id="daily-plan-title"
                  {...register("title")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="e.g. Finish API integration"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="daily-plan-description"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="daily-plan-description"
                  {...register("description")}
                  rows={2}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none"
                  placeholder="Any details for this task..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add to plan"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                  className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ListChecks className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                No tasks planned yet. Add what you intend to work on today.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="glass-card p-4 flex items-start gap-3"
              >
                <button
                  type="button"
                  onClick={() => toggleTaskStatus(item)}
                  disabled={busyItemId === item.id}
                  aria-label={`Mark ${item.title} as ${nextStatus(item.status).replace("_", " ").toLowerCase()}`}
                  className="mt-0.5 shrink-0 disabled:opacity-50"
                >
                  {busyItemId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  ) : (
                    statusIcon(item.status)
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={cn(
                        "text-sm font-medium truncate",
                        item.status === "DONE"
                          ? "text-slate-400 line-through"
                          : "text-white"
                      )}
                    >
                      {item.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        getStatusColor(item.status)
                      )}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                {!isSubmitted && (
                  <button
                    type="button"
                    onClick={() => deleteTask(item.id)}
                    disabled={busyItemId === item.id}
                    aria-label={`Delete task: ${item.title}`}
                    className="opacity-60 hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {!isSubmitted && items.length > 0 && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={submitPlan}
              disabled={submitting}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit daily plan
            </button>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
