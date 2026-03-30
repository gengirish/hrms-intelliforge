"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const resetPasswordSuspenseFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
  </div>
);

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={resetPasswordSuspenseFallback}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const hasToken = !!tokenParam && !!emailParam;

  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to send reset email");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailParam,
          token: tokenParam,
          password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetDone(true);
        toast.success("Password reset successfully!");
      } else {
        toast.error(data.error || "Reset failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            IntelliForge HRMS
          </h1>
          <p className="text-slate-400 mt-2">
            {hasToken ? "Set your new password" : "Reset your password"}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {resetDone ? (
            <div className="text-center space-y-4">
              <div className="text-emerald-400 text-lg font-medium">
                Password reset complete
              </div>
              <Link
                href="/sign-in"
                className="inline-block px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Sign in with new password
              </Link>
            </div>
          ) : hasToken ? (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm-new" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="confirm-new"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Repeat new password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          ) : sent ? (
            <div className="text-center space-y-3">
              <div className="text-emerald-400 font-medium">
                Check your email
              </div>
              <p className="text-slate-400 text-sm">
                If an account exists for {email}, we&apos;ve sent a reset link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/sign-in" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
