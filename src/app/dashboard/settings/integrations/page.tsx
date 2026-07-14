"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";
import type { IntegrationHealth } from "@/lib/integrations-health";

interface HealthResponse {
  integrations: IntegrationHealth[];
  summary: { total: number; configured: number; missing: number };
}

export default function IntegrationsHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/integrations");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load integrations");
        }
        const json = (await res.json()) as HealthResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load integrations"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Breadcrumbs className="mb-4" />

      <div className="flex items-center gap-3 mb-2">
          <Link
            href="/dashboard/settings"
            aria-label="Back to settings"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Plug className="h-6 w-6 text-indigo-400" aria-hidden="true" />
              Integrations Health
            </h1>
            <p className="text-sm text-slate-400">
              Deployment-level status for connected services and API keys.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          </div>
        ) : !data ? (
          <div className="glass-card p-8 text-center text-slate-400">
            Could not load integration status.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-8 mt-6">
              <span className="rounded-full bg-emerald-900/40 border border-emerald-700/50 px-3 py-1 text-xs font-medium text-emerald-300">
                {data.summary.configured} configured
              </span>
              <span className="rounded-full bg-amber-900/40 border border-amber-700/50 px-3 py-1 text-xs font-medium text-amber-300">
                {data.summary.missing} missing
              </span>
              <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400">
                {data.summary.total} total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.integrations.map((integration) => (
                <article
                  key={integration.id}
                  className={cn(
                    "glass-card p-5 flex flex-col gap-3 border-l-4",
                    integration.configured
                      ? "border-l-emerald-500"
                      : "border-l-amber-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-white">
                      {integration.name}
                    </h2>
                    {integration.configured ? (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-emerald-400"
                        aria-label="Configured"
                      />
                    ) : (
                      <AlertTriangle
                        className="h-5 w-5 shrink-0 text-amber-400"
                        aria-label="Not configured"
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed flex-1">
                    {integration.description}
                  </p>

                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        integration.configured
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-amber-900/50 text-amber-300"
                      )}
                    >
                      {integration.configured ? "Configured" : "Missing env vars"}
                    </span>
                  </div>

                  {!integration.configured && (
                    <ul className="text-xs text-slate-500 space-y-0.5 font-mono">
                      {integration.envVars.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>

            <p className="mt-8 text-xs text-slate-500">
              Status reflects server environment variables on this deployment.
              Org-specific settings (e.g. WhatsApp phone ID) are managed under{" "}
              <Link
                href="/dashboard/settings"
                className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
              >
                Organization Settings
              </Link>
              .
            </p>
          </>
        )}
    </>
  );
}
