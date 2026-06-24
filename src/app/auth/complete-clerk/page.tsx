"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  PENDING_ORG_STORAGE_KEY,
  type PendingOrgPayload,
} from "@/lib/clerk-config";

function CompleteClerkInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const mode = searchParams.get("mode");
  const { isLoaded, isSignedIn } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        let body: { createOrg?: PendingOrgPayload } | undefined;

        if (mode === "create-org") {
          const raw = sessionStorage.getItem(PENDING_ORG_STORAGE_KEY);
          if (!raw) {
            if (!cancelled) {
              setError("Missing organization details. Start again from Create Organization.");
            }
            return;
          }
          body = { createOrg: JSON.parse(raw) as PendingOrgPayload };
        }

        const res = await fetch("/api/auth/sync-clerk", {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Could not link your account.");
          return;
        }

        if (mode === "create-org") {
          sessionStorage.removeItem(PENDING_ORG_STORAGE_KEY);
        }

        if (!cancelled) {
          router.replace(redirect);
          router.refresh();
        }
      } catch {
        if (!cancelled) setError("Network error. Try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, redirect, mode, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    const returnPath = `/auth/complete-clerk?redirect=${encodeURIComponent(redirect)}${mode ? `&mode=${mode}` : ""}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-slate-100">
        <p className="text-slate-300">Sign in with Clerk to finish setting up your workspace.</p>
        <Link
          href={`/sign-up?redirect=${encodeURIComponent(returnPath)}`}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Continue with Clerk
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-slate-100">
        <AlertCircle className="h-10 w-10 text-amber-400" />
        <p className="max-w-md text-slate-300">{error}</p>
        <div className="flex gap-3">
          <Link href="/create-org" className="text-sm text-brand-400 hover:underline">
            Create organization
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-100">
      <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      <p className="text-sm text-slate-400">
        {mode === "create-org" ? "Creating your workspace…" : "Linking your workspace…"}
      </p>
    </div>
  );
}

export default function CompleteClerkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      }
    >
      <CompleteClerkInner />
    </Suspense>
  );
}
