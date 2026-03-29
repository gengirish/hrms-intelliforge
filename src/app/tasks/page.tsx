"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { cn, getCurrentISOWeek, getStatusColor } from "@/lib/utils";

interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  hours: number;
  week: string;
  createdAt: string;
}

const taskSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().min(5, "Description required"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  hours: z.coerce.number().min(0.5, "At least 0.5 hours").max(40, "Max 40 hours"),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function TasksPage() {
  const [email, setEmail] = useState("");
  const [authed, setAuthed] = useState(false);
  const [internId, setInternId] = useState("");
  const [internName, setInternName] = useState("");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const currentWeek = getCurrentISOWeek();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({ resolver: zodResolver(taskSchema) });

  async function handleLogin() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tasks?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }
      const data = await res.json();
      setInternId(data.internId);
      setInternName(data.internName);
      setTasks(data.tasks);
      setAuthed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: TaskFormData) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, internId, week: currentWeek }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add task");
      }
      const newTask = await res.json();
      setTasks((prev) => [newTask, ...prev]);
      reset();
      setShowForm(false);
      toast.success("Task added!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task removed");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  const statusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "IN_PROGRESS":
        return <PlayCircle className="h-4 w-4 text-indigo-400" />;
      default:
        return <Circle className="h-4 w-4 text-slate-400" />;
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <ClipboardList className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white">Weekly Tasks</h1>
              <p className="text-sm text-slate-400 mt-1">
                Log in with your registered email
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                placeholder="your.email@example.com"
              />
              <button
                onClick={handleLogin}
                disabled={loading || !email}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </button>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-700/50 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">What you can do</p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Plus className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>Log tasks with title, description and hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <PlayCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span>Track status: Todo to In Progress to Done</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>View all tasks for the current ISO week</span>
              </div>
            </div>
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

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Weekly Tasks</h1>
            <p className="mt-1 text-slate-400">
              {internName} &middot; Week {currentWeek}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Hours</p>
              <p className="text-lg font-bold text-white">{totalHours}h</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Add Task Form */}
        {showForm && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">New Task</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Title
                </label>
                <input
                  {...register("title")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="Build landing page"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none"
                  placeholder="Describe what you worked on..."
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Hours
                  </label>
                  <input
                    {...register("hours")}
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                    placeholder="4"
                  />
                  {errors.hours && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.hours.message}
                    </p>
                  )}
                </div>
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
                    "Save Task"
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

        {/* Task List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                No tasks logged this week. Click &quot;Add Task&quot; to get started.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="glass-card p-4 flex items-start gap-3 group"
              >
                {statusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white truncate">
                      {task.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        getStatusColor(task.status)
                      )}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.hours}h
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
