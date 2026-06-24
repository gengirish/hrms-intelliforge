"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isClerkEnabled } from "@/lib/clerk-config";
import { hrmsClerkAppearance } from "@/lib/clerk-appearance";

const signInSuspenseFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
  </div>
);

export default function SignInPage() {
  return (
    <Suspense fallback={signInSuspenseFallback}>
      <SignInForm />
    </Suspense>
  );
}

function LegacySignInFields({
  email,
  password,
  loginError,
  loading,
  magicLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onMagicLink,
}: {
  email: string;
  password: string;
  loginError: string | null;
  loading: boolean;
  magicLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMagicLink: () => void;
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-200 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="input-base"
            placeholder="you@example.com"
            aria-invalid={!!loginError}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-200"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-brand-300 hover:text-brand-200 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="input-base"
            placeholder="Enter your password"
            aria-invalid={!!loginError}
            aria-describedby={loginError ? "login-error" : undefined}
          />
        </div>

        {loginError && (
          <p
            id="login-error"
            className="flex items-start gap-2 text-sm text-red-300"
            role="alert"
          >
            <AlertCircle
              className="h-4 w-4 mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{loginError}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={onMagicLink}
        disabled={magicLoading}
        className="btn-secondary mt-5 w-full py-2.5"
      >
        {magicLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Send Magic Link
          </>
        )}
      </button>
    </>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const verified = searchParams.get("verified");
  const errorParam = searchParams.get("error");
  const { refresh } = useAuth();
  const clerkEnabled = isClerkEnabled();
  const clerkCompleteRedirect = `/auth/complete-clerk?redirect=${encodeURIComponent(redirect)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Invalid email or password";
        toast.error(msg);
        setLoginError(msg);
        return;
      }
      toast.success("Signed in successfully");
      await refresh();
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
      setLoginError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setMagicLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to send magic link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setMagicLoading(false);
    }
  }

  const legacyFields = (
    <LegacySignInFields
      email={email}
      password={password}
      loginError={loginError}
      loading={loading}
      magicLoading={magicLoading}
      onEmailChange={(value) => {
        setEmail(value);
        setLoginError(null);
      }}
      onPasswordChange={(value) => {
        setPassword(value);
        setLoginError(null);
      }}
      onSubmit={handleLogin}
      onMagicLink={handleMagicLink}
    />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="absolute inset-0 gradient-hero pointer-events-none"
        aria-hidden="true"
      />

      <main id="main-content" className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-6 text-sm text-slate-400 hover:text-brand-300 transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand font-bold text-white text-xs shadow-brand-glow">
                IF
              </span>
              <span className="font-semibold text-white">
                IntelliForge{" "}
                <span className="text-slate-400 font-normal">AI</span>
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-slate-400 mt-2 text-sm">
              {clerkEnabled
                ? "Sign in with Google or email for admins and team members"
                : "Sign in to your IntelliForge HRMS account"}
            </p>
          </div>

          {verified && (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-2"
            >
              <CheckCircle2
                className="h-4 w-4 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>Email verified successfully. You can now sign in.</span>
            </div>
          )}
          {errorParam === "expired_link" && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2"
            >
              <AlertCircle
                className="h-4 w-4 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>That link has expired. Please try again.</span>
            </div>
          )}

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md p-7 sm:p-8 shadow-trust-card">
            {clerkEnabled ? (
              <>
                <SignIn
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                  forceRedirectUrl={clerkCompleteRedirect}
                  fallbackRedirectUrl={clerkCompleteRedirect}
                  appearance={hrmsClerkAppearance}
                />

                <details
                  data-testid="intern-sign-in"
                  className="group mt-8 rounded-xl border border-slate-800 bg-slate-950/40 open:pb-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
                    <span>Intern sign-in (email, password, or magic link)</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t border-slate-800 px-4 pt-5">
                    {legacyFields}
                  </div>
                </details>
              </>
            ) : (
              legacyFields
            )}
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-brand-300 hover:text-brand-200 font-medium transition-colors"
            >
              Sign up
            </Link>
          </p>

          <aside
            aria-label="Site attribution"
            className="mt-6 text-center text-[11px] text-slate-500"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>
                A product of{" "}
                <a
                  href="https://www.intelliforge.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors font-medium focus-visible:underline focus-visible:outline-none rounded"
                >
                  IntelliForge AI
                  <ExternalLink
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </a>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Built by{" "}
                <a
                  href="https://girishbhiremath.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors font-medium focus-visible:underline focus-visible:outline-none rounded"
                >
                  Girish Hiremath
                  <ExternalLink
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </a>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-brand-400"
                  aria-hidden="true"
                />
                Aligned with Bharat AI Mission
              </span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
