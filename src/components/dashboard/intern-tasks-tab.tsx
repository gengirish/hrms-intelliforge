"use client";

import Link from "next/link";
import { cn, getStatusColor } from "@/lib/utils";
import type { Intern } from "./types";

interface InternTasksTabProps {
  intern: Intern;
  active: boolean;
}

export function InternTasksTab({ intern, active }: InternTasksTabProps) {
  return (
    <div
      id="panel-tasks"
      role="tabpanel"
      aria-labelledby="tab-tasks"
      hidden={!active}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-sm font-semibold text-white">Task Log</h3>
        {intern.status === "ACTIVE" && (
          <Link
            href={`/dashboard/tasks?internId=${encodeURIComponent(intern.id)}`}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            Assign week tasks →
          </Link>
        )}
      </div>
      {!intern.tasks || intern.tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No tasks logged yet.</p>
      ) : (
        <div className="space-y-3">
          {intern.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{task.title}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      getStatusColor(task.status)
                    )}
                  >
                    {task.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{task.description}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {task.hours}h &middot; Week {task.week}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
