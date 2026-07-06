"use client";

import { Loader2, MessageSquare, Send } from "lucide-react";
import { cn, formatDateIST } from "@/lib/utils";
import type { Intern, NotificationRecord } from "./types";

interface InternNotificationsTabProps {
  intern: Intern;
  active: boolean;
  notifications: NotificationRecord[];
  notificationsLoading: boolean;
}

export function InternNotificationsTab({
  intern,
  active,
  notifications,
  notificationsLoading,
}: InternNotificationsTabProps) {
  return (
    <div
      id="panel-notifications"
      role="tabpanel"
      aria-labelledby="tab-notifications"
      hidden={!active}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Notification History</h3>
        <div className="flex items-center gap-2">
          {intern.whatsappOptIn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <MessageSquare className="h-3 w-3" />
              WhatsApp enabled
            </span>
          )}
        </div>
      </div>
      {notificationsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No notifications sent yet.
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
            >
              <div
                className={cn(
                  "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  notif.channel === "WHATSAPP"
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "bg-indigo-900/50 text-indigo-400"
                )}
              >
                {notif.channel === "WHATSAPP" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white truncate">
                    {notif.type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                      notif.status === "READ"
                        ? "bg-emerald-100 text-emerald-800"
                        : notif.status === "DELIVERED"
                          ? "bg-blue-100 text-blue-800"
                          : notif.status === "SENT"
                            ? "bg-slate-100 text-slate-800"
                            : notif.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                    )}
                  >
                    {notif.status}
                  </span>
                </div>
                {notif.subject && (
                  <p className="text-xs text-slate-400 truncate">{notif.subject}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {notif.sentAt
                    ? formatDateIST(notif.sentAt)
                    : formatDateIST(notif.createdAt)}
                  {notif.readAt && (
                    <span className="ml-2 text-emerald-500">
                      Read {formatDateIST(notif.readAt)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
