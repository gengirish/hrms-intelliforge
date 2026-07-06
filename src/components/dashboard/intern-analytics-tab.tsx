"use client";

import {
  Loader2,
  BarChart3,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { cn, formatDateIST } from "@/lib/utils";
import type { PerformanceScoreRecord, PerformanceReviewRecord } from "./types";

interface InternAnalyticsTabProps {
  active: boolean;
  analyticsLoading: boolean;
  perfScores: PerformanceScoreRecord[];
  perfReview: PerformanceReviewRecord | null;
  reviewLoading: boolean;
  onRegenerateReview: () => void;
}

export function InternAnalyticsTab({
  active,
  analyticsLoading,
  perfScores,
  perfReview,
  reviewLoading,
  onRegenerateReview,
}: InternAnalyticsTabProps) {
  return (
    <div
      id="panel-analytics"
      role="tabpanel"
      aria-labelledby="tab-analytics"
      hidden={!active}
      className="space-y-6"
    >
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : perfScores.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <BarChart3 className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No performance scores computed yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Scores are computed daily via cron job.
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Performance Trend
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="weekLabel" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overallScore"
                    name="Overall"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ fill: "#818cf8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendanceScore"
                    name="Attendance"
                    stroke="#34d399"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="taskScore"
                    name="Tasks"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              Latest Score Breakdown
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[perfScores[perfScores.length - 1]]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="weekLabel"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="attendanceScore" name="Attendance" fill="#34d399" barSize={20} />
                  <Bar dataKey="taskScore" name="Tasks" fill="#fbbf24" barSize={20} />
                  <Bar
                    dataKey="consistencyScore"
                    name="Consistency"
                    fill="#818cf8"
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                AI Performance Review
              </h3>
              <button
                onClick={onRegenerateReview}
                disabled={reviewLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                {reviewLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regenerate
              </button>
            </div>
            {perfReview ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">{perfReview.summary}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Recommendation:</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      perfReview.recommendation === "CONVERT_FULL_TIME"
                        ? "bg-emerald-100 text-emerald-800"
                        : perfReview.recommendation === "EXTEND"
                          ? "bg-blue-100 text-blue-800"
                          : perfReview.recommendation === "ON_TRACK"
                            ? "bg-slate-100 text-slate-800"
                            : "bg-orange-100 text-orange-800"
                    )}
                  >
                    {perfReview.recommendation.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Generated {formatDateIST(perfReview.generatedAt)} (
                  {formatDateIST(perfReview.periodStart)} —{" "}
                  {formatDateIST(perfReview.periodEnd)})
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No review generated yet. Click &ldquo;Regenerate&rdquo; to create one.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
