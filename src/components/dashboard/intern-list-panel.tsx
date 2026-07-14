"use client";

import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  Send,
  Award,
  CalendarDays,
  ArrowRight,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cn, formatDateIST, getStatusColor } from "@/lib/utils";
import type { Intern, AttendanceSummary, DashboardStats } from "./types";

interface InternListPanelProps {
  stats: DashboardStats;
  attendanceSummary: AttendanceSummary | null;
  attendanceLoading: boolean;
  interns: Intern[];
  filteredInterns: Intern[];
  showDeactivated: boolean;
  onShowDeactivatedChange: (value: boolean) => void;
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  joinFrom: string;
  onJoinFromChange: (value: string) => void;
  joinTo: string;
  onJoinToChange: (value: string) => void;
  onSelectIntern: (internId: string) => void;
}

export function InternListPanel({
  stats,
  attendanceSummary,
  attendanceLoading,
  interns,
  filteredInterns,
  showDeactivated,
  onShowDeactivatedChange,
  nameFilter,
  onNameFilterChange,
  statusFilter,
  onStatusFilterChange,
  joinFrom,
  onJoinFromChange,
  joinTo,
  onJoinToChange,
  onSelectIntern,
}: InternListPanelProps) {
  return (
    <>
      <Breadcrumbs className="mb-4" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Manage interns, send offers, and track progress.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Total Interns",
            value: stats.total,
            icon: Users,
            color: "text-indigo-400",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock,
            color: "text-yellow-400",
          },
          {
            label: "Offered",
            value: stats.offered,
            icon: Send,
            color: "text-blue-400",
          },
          {
            label: "Active",
            value: stats.active,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: Award,
            color: "text-purple-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/attendance"
        className="glass-card p-5 mb-8 block hover:border-indigo-500/40 transition-colors group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Today&apos;s Attendance</h2>
              {attendanceLoading ? (
                <p className="text-sm text-slate-400 mt-1">Loading snapshot…</p>
              ) : attendanceSummary ? (
                <p className="text-sm text-slate-400 mt-1">
                  <span className="text-emerald-400 font-medium">
                    {attendanceSummary.present} present
                  </span>
                  {" · "}
                  <span className="text-red-400 font-medium">
                    {attendanceSummary.absent} absent
                  </span>
                  {" · "}
                  {attendanceSummary.total} active interns
                </p>
              ) : (
                <p className="text-sm text-slate-400 mt-1">
                  View punch-in status and weekly records
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
            Open attendance
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Interns</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredInterns.length} of {interns.length} shown
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDeactivated}
                onChange={(e) => onShowDeactivatedChange(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              Show deactivated
            </label>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => onNameFilterChange(e.target.value)}
                placeholder="Search by name, email, or role…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:border-indigo-500 outline-none transition-colors min-w-[10rem]"
                >
                  <option value="all">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="OFFERED">Offered</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
              <input
                type="date"
                value={joinFrom}
                onChange={(e) => onJoinFromChange(e.target.value)}
                aria-label="Joined from"
                className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
              />
              <input
                type="date"
                value={joinTo}
                onChange={(e) => onJoinToChange(e.target.value)}
                aria-label="Joined to"
                className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Role</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">
                  Joined
                </th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {interns.length === 0
                      ? "No interns onboarded yet."
                      : "No interns match your filters."}
                  </td>
                </tr>
              ) : (
                filteredInterns.map((intern) => (
                  <tr
                    key={intern.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${intern.name}`}
                    className={cn(
                      "border-b border-slate-800 last:border-0 hover:bg-slate-800/30 cursor-pointer transition-colors",
                      intern.deactivated && "opacity-50"
                    )}
                    onClick={() => onSelectIntern(intern.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectIntern(intern.id);
                      }
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xs font-bold text-white">
                          {intern.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{intern.name}</p>
                          <p className="text-xs text-slate-500">{intern.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{intern.role}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            getStatusColor(intern.status)
                          )}
                        >
                          {intern.status}
                        </span>
                        {intern.deactivated && (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-900/50 text-red-400">
                            Deactivated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                      {intern.email}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                      {formatDateIST(intern.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
