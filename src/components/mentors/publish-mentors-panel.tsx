"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2 } from "lucide-react";

interface DirectoryStatus {
  total: number;
  publicCount: number;
  hiddenCount: number;
}

export function PublishMentorsPanel() {
  const [status, setStatus] = useState<DirectoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/mentors/publish-all");
      if (res.status === 401 || res.status === 403) {
        setStatus(null);
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as DirectoryStatus;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handlePublishAll() {
    setPublishing(true);
    try {
      const res = await fetch("/api/mentors/publish-all", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Could not publish mentors"
        );
        return;
      }
      const updated = typeof data.updated === "number" ? data.updated : 0;
      toast.success(
        updated > 0
          ? `Published ${updated} mentor${updated === 1 ? "" : "s"} to /mentors`
          : "All mentors were already listed"
      );
      setStatus({
        total: data.total ?? status?.total ?? 0,
        publicCount: data.publicCount ?? status?.publicCount ?? 0,
        hiddenCount: data.hiddenCount ?? 0,
      });
    } catch {
      toast.error("Could not publish mentors");
    } finally {
      setPublishing(false);
    }
  }

  if (loading || !status) return null;
  if (status.total === 0) return null;

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-400" />
            Program mentor directory
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {status.publicCount} of {status.total} mentor
            {status.total !== 1 ? "s" : ""} visible on{" "}
            <a href="/mentors" className="text-indigo-400 hover:text-indigo-300">
              /mentors
            </a>
            {status.hiddenCount > 0
              ? ` · ${status.hiddenCount} hidden`
              : ""}
          </p>
        </div>
        {status.hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => void handlePublishAll()}
            disabled={publishing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white shrink-0"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Publish all mentors
          </button>
        )}
      </div>
    </div>
  );
}
