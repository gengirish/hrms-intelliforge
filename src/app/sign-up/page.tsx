"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { captureEvent, grantAnalyticsConsent } from "@/lib/posthog";
import { useAuth } from "@/lib/auth-context";

interface OrgBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          Loading…
        </div>
      }
    >
      <SignUpBody />
    </Suspense>
  );
}

function SignUpBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const orgSlug = searchParams.get("org")?.trim() || null;
  const { refresh } = useAuth();

  const [org, setOrg] = useState<OrgBranding | null>(null);
  const [orgLoading, setOrgLoading] = useState(!!orgSlug);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [passwordShortError, setPasswordShortError] = useState<string | null>(null);
  const [passwordMismatchError, setPasswordMismatchError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) return;

    let cancelled = false;
    (async () => {
      setOrgLoading(true);
      setOrgError(null);
      try {
        const res = await fetch(`/api/orgs/${encodeURIComponent(orgSlug)}/public`);
        if (!res.ok) {
          if (!cancelled) {
            setOrgError("Organization not found");
            setOrg(null);
          }
          return;
        }
        const data = (await res.json()) as OrgBranding;
        if (!cancelled) setOrg(data);
      } catch {
        if (!cancelled) setOrgError("Failed to load organization");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "password") {
      setPasswordShortError(null);
      setPasswordMismatchError(null);
    }
    if (field === "confirmPassword") setPasswordMismatchError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordShortError(null);
    setPasswordMismatchError(null);

    if (orgSlug && orgError) {
      toast.error(orgError);
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setPasswordShortError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      setPasswordMismatchError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          ...(orgSlug ? { orgSlug } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      toast.success("Account created! Check your email to verify.");
      grantAnalyticsConsent();
      captureEvent("sign_up", { email: form.email, orgSlug: orgSlug ?? undefined });
      await refresh();
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const title = org?.name ?? "IntelliForge HRMS";
  const subtitle = org
    ? `Create your account at ${org.name}`
    : "Create your account";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {org?.logoUrl && (
            <div className="mb-4 flex justify-center">
              <Image
                src={org.logoUrl}
                alt={`${org.name} logo`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-contain"
                unoptimized
              />
            </div>
          )}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {orgLoading ? "Loading…" : title}
          </h1>
          <p className="text-slate-400 mt-2">{subtitle}</p>
          {orgError && (
            <p className="text-sm text-red-400 mt-2" role="alert">
              {orgError}
            </p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Min 8 characters"
              />
              {passwordShortError && (
                <p className="text-sm text-red-400 mt-1" role="alert">
                  {passwordShortError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Repeat your password"
              />
              {passwordMismatchError && (
                <p className="text-sm text-red-400 mt-1" role="alert">
                  {passwordMismatchError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (Boolean(orgSlug) && orgLoading)}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href={orgSlug ? `/sign-in?org=${encodeURIComponent(orgSlug)}` : "/sign-in"}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
