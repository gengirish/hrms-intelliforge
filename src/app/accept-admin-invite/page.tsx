"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const suspenseFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
  </div>
);

export default function AcceptAdminInvitePage() {
  return (
    <Suspense fallback={suspenseFallback}>
      <AcceptAdminInviteForm />
    </Suspense>
  );
}

function AcceptAdminInviteForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("t")?.trim() ?? "";

  const [previewLoading, setPreviewLoading] = useState(true);
  const [preview, setPreview] = useState<{
    valid: boolean;
    email?: string;
    organizationName?: string;
    role?: string;
    isPromotion?: boolean;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setPreview({ valid: false });
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/org/admins/invite/preview?t=${encodeURIComponent(tokenParam)}`
        );
        const data = await res.json().catch(() => ({ valid: false }));
        if (!cancelled) {
          setPreview(data);
        }
      } catch {
        if (!cancelled) setPreview({ valid: false });
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/org/admins/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenParam, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not complete signup");
        return;
      }
      toast.success(data.message || "Welcome!");
      setDone(true);
      window.location.href = "/dashboard";
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (previewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!tokenParam || !preview?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Invalid or expired invite</h1>
          <p className="text-slate-400 text-sm">
            Ask your workspace admin to send a new invitation, or sign in if you already have an account.
          </p>
          <Link
            href="/sign-in"
            className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            IntelliForge HRMS
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {preview.isPromotion ? "Complete your team access" : "Accept your invitation"}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
          <div className="text-sm text-slate-300 space-y-1">
            <p>
              <span className="text-slate-500">Organization:</span>{" "}
              <span className="text-white font-medium">{preview.organizationName}</span>
            </p>
            <p>
              <span className="text-slate-500">Signing up as:</span>{" "}
              <span className="text-white font-medium">{preview.email}</span>
            </p>
            <p>
              <span className="text-slate-500">Role:</span>{" "}
              <span className="text-white font-medium">
                {preview.role === "MENTOR" ? "Mentor" : "Full admin"}
              </span>
            </p>
          </div>

          {done ? (
            <p className="text-center text-emerald-400 text-sm">Redirecting to your dashboard…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div>
                <label htmlFor="invite-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Choose password
                </label>
                <input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="invite-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="invite-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  "Activate account"
                )}
              </button>
            </form>
          )}

          <p className="text-xs text-slate-500 text-center pt-2">
            Wrong person? Close this page — the link only works once it is used successfully.
          </p>
        </div>
      </div>
    </div>
  );
}
