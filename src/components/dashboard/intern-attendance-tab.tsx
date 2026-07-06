"use client";

import { formatDateIST, formatTimeIST } from "@/lib/utils";
import type { Intern } from "./types";

interface InternAttendanceTabProps {
  intern: Intern;
  active: boolean;
}

export function InternAttendanceTab({ intern, active }: InternAttendanceTabProps) {
  return (
    <div
      id="panel-attendance"
      role="tabpanel"
      aria-labelledby="tab-attendance"
      hidden={!active}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold text-white mb-4">Attendance Records</h3>
      {!intern.attendance || intern.attendance.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No attendance records yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Date</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">In</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Out</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Mode</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">
                  Daily Status
                </th>
              </tr>
            </thead>
            <tbody>
              {intern.attendance.map((rec) => (
                <tr key={rec.id} className="border-b border-slate-800 last:border-0">
                  <td className="py-2 px-2 text-white">{formatDateIST(rec.date)}</td>
                  <td className="py-2 px-2 text-slate-300">
                    {rec.punchIn ? formatTimeIST(rec.punchIn) : "—"}
                  </td>
                  <td className="py-2 px-2 text-slate-300">
                    {rec.punchOut ? formatTimeIST(rec.punchOut) : "—"}
                  </td>
                  <td className="py-2 px-2 text-slate-300">{rec.mode}</td>
                  <td
                    className="py-2 px-2 text-slate-400 text-xs max-w-48 truncate"
                    title={rec.dailyStatus || ""}
                  >
                    {rec.dailyStatus || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
