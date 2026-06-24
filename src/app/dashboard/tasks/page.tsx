"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { useAuth } from "@/lib/auth-context";
import { cn, getCurrentISOWeek, getStatusColor } from "@/lib/utils";

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

interface InternOption {
  id: string;
  name: string;
  email: string;
  status: string;
  mentorId: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  hours: number;
  week: string;
}

interface DraftTask {
  key: string;
  title: string;
  description: string;
  hours: string;
}

function recentWeekOptions(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const t = new Date(d);
    t.setDate(t.getDate() - i * 7);
    const jan1 = new Date(t.getFullYear(), 0, 1);
    const days = Math.floor(
      (t.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
    out.push(`${t.getFullYear()}-W${String(weekNum).padStart(2, "0")}`);
  }
  const seen = new Map<string, true>();
  const deduped: string[] = [];
  for (const w of out) {
    if (!seen.has(w)) {
      seen.set(w, true);
      deduped.push(w);
    }
  }
  return deduped;
}

function emptyDraft(): DraftTask {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    hours: "1",
  };
}

function TasksPageFallback() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4"
      >
        <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading task assignment…</p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}

export default function DashboardTasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <DashboardTasksContent />
    </Suspense>
  );
}

function DashboardTasksContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const defaultWeek = useMemo(() => getCurrentISOWeek(), []);
  const weekOptions = useMemo(() => recentWeekOptions(16), []);

  const [week, setWeek] = useState(
    searchParams.get("week") && WEEK_KEY_RE.test(searchParams.get("week")!)
      ? searchParams.get("week")!
      : defaultWeek
  );
  const [internId, setInternId] = useState(searchParams.get("internId") ?? "");
  const [interns, setInterns] = useState<InternOption[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [internName, setInternName] = useState("");
  const [loadingInterns, setLoadingInterns] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [drafts, setDrafts] = useState<DraftTask[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isMentor =
    user?.accountType === "admin" && user?.orgAdminRole === "MENTOR";

  const assignableInterns = useMemo(() => {
    let list = interns.filter((i) => i.status === "ACTIVE");
    if (isMentor && user?.id) {
      list = list.filter((i) => i.mentorId === user.id);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [interns, isMentor, user?.id]);

  const loadInterns = useCallback(async () => {
    setLoadingInterns(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load interns");
      const data = await res.json();
      setInterns(data.interns ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load interns");
    } finally {
      setLoadingInterns(false);
    }
  }, []);

  const loadTasks = useCallback(async (id: string, w: string) => {
    if (!id || !WEEK_KEY_RE.test(w)) {
      setTasks([]);
      setInternName("");
      return;
    }
    setLoadingTasks(true);
    try {
      const res = await fetch(
        `/api/dashboard/tasks?internId=${encodeURIComponent(id)}&week=${encodeURIComponent(w)}`
      );
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.status === 404) {
        setTasks([]);
        setInternName("");
        toast.error("Intern not found or not in your scope");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load tasks");
      }
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setInternName(data.internName ?? "");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    void loadInterns();
  }, [loadInterns]);

  useEffect(() => {
    if (internId) void loadTasks(internId, week);
  }, [internId, week, loadTasks]);

  useEffect(() => {
    const fromUrl = searchParams.get("internId");
    if (fromUrl && !internId) setInternId(fromUrl);
  }, [searchParams, internId]);

  function addDraftRow() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  function removeDraftRow(key: string) {
    setDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)
    );
  }

  function updateDraft(key: string, field: keyof DraftTask, value: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: value } : d))
    );
  }

  async function assignTasks() {
    if (!internId) {
      toast.error("Select an intern first");
      return;
    }
    const payloadTasks = drafts
      .map((d) => ({
        title: d.title.trim(),
        description: d.description.trim(),
        hours: parseFloat(d.hours) || 1,
      }))
      .filter((t) => t.title.length > 0);

    if (payloadTasks.length === 0) {
      toast.error("Add at least one task with a title");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internId,
          weekKey: week,
          tasks: payloadTasks,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        toast.error("You don't have permission to assign tasks");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign tasks");
      }
      const data = await res.json();
      toast.success(`Assigned ${data.count} task(s) for week ${week}`);
      setDrafts([emptyDraft()]);
      await loadTasks(internId, week);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign tasks");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(taskId: string) {
    setDeletingId(taskId);
    try {
      const res = await fetch(
        `/api/dashboard/tasks?id=${encodeURIComponent(taskId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Delete failed");
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
        >
          <div className="glass-card p-8 max-w-md w-full text-center">
            <ClipboardList className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin access required</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in with an admin or mentor account to assign weekly tasks.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Back to dashboard
            </Link>
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
        className="flex-1 mx-auto max-w-4xl w-full px-4 py-8"
      >
        <Breadcrumbs className="mb-4" />
        <DashboardSubnav className="mb-6" />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Assign weekly tasks</h1>
          <p className="mt-1 text-slate-400">
            Add tasks for an intern&apos;s whole week. They appear on the intern&apos;s Tasks page.
          </p>
        </div>

        <div className="glass-card p-6 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="assign-week"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Week
              </label>
              <select
                id="assign-week"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 outline-none"
              >
                {weekOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="assign-intern"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Intern
              </label>
              <select
                id="assign-intern"
                value={internId}
                onChange={(e) => setInternId(e.target.value)}
                disabled={loadingInterns}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 outline-none disabled:opacity-50"
              >
                <option value="">Select intern…</option>
                {assignableInterns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {internId && (
          <>
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  New tasks for {internName || "intern"} &middot; {week}
                </h2>
                <button
                  type="button"
                  onClick={addDraftRow}
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="h-4 w-4" />
                  Add row
                </button>
              </div>

              <div className="space-y-4">
                {drafts.map((draft, index) => (
                  <div
                    key={draft.key}
                    className="rounded-lg border border-slate-700/80 bg-slate-900/30 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Task {index + 1}
                      </span>
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftRow(draft.key)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          aria-label="Remove task row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <input
                      value={draft.title}
                      onChange={(e) =>
                        updateDraft(draft.key, "title", e.target.value)
                      }
                      placeholder="Task title"
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                    />
                    <textarea
                      value={draft.description}
                      onChange={(e) =>
                        updateDraft(draft.key, "description", e.target.value)
                      }
                      rows={2}
                      placeholder="Description (optional)"
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-none"
                    />
                    <div className="w-32">
                      <label className="block text-xs text-slate-400 mb-1">
                        Est. hours
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="40"
                        step="0.5"
                        value={draft.hours}
                        onChange={(e) =>
                          updateDraft(draft.key, "hours", e.target.value)
                        }
                        className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void assignTasks()}
                disabled={saving}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Assign tasks for week
              </button>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Tasks already assigned ({week})
              </h2>
              {loadingTasks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No tasks for this week yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {task.title}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              getStatusColor(task.status)
                            )}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400">
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {task.hours}h estimated
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteTask(task.id)}
                        disabled={deletingId === task.id}
                        aria-label={`Delete task ${task.title}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === task.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!internId && !loadingInterns && (
          <div className="glass-card p-8 text-center text-sm text-slate-400">
            {assignableInterns.length === 0
              ? "No active interns available to assign tasks."
              : "Select an intern and week to assign tasks."}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
