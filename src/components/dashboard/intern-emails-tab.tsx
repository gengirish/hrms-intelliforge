"use client";

import { formatDateIST } from "@/lib/utils";
import type { Intern } from "./types";

interface InternEmailsTabProps {
  intern: Intern;
  active: boolean;
}

export function InternEmailsTab({ intern, active }: InternEmailsTabProps) {
  return (
    <div
      id="panel-emails"
      role="tabpanel"
      aria-labelledby="tab-emails"
      hidden={!active}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold text-white mb-4">Email thread</h3>
      {!intern.messages || intern.messages.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          All HR email goes from{" "}
          <span className="text-slate-300">hr@intelliforge.tech</span> to this
          intern&apos;s address. View replies in the AgentMail console for the shared
          HR inbox.
        </p>
      ) : (
        <div className="space-y-3">
          {intern.messages.map((msg) => (
            <div key={msg.messageId} className="p-3 rounded-lg bg-slate-900/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{msg.subject}</span>
                <span className="text-xs text-slate-500">
                  {formatDateIST(msg.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-400">From: {msg.from}</p>
              {msg.text && (
                <p className="text-xs text-slate-300 mt-2 line-clamp-3">{msg.text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
