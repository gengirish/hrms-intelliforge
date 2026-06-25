"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function CreateOrgPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    orgName: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "orgName" && !form.slug) {
      setForm((prev) => ({
        ...prev,
        [field]: value,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.adminPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create organization");
        return;
      }

      toast.success("Organization created! Redirecting to dashboard...");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass-card p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 mb-4">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Your Organization</h1>
            <p className="text-sm text-slate-400 mt-2">
              Set up your HR workspace. Free plan includes 5 interns.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-slate-300 mb-1">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={form.orgName}
                  onChange={(e) => update("orgName", e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-slate-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">hrms.intelliforge.tech/</span>
                  <input
                    id="slug"
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                    placeholder="acme-corp"
                    className="flex-1 rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <hr className="border-slate-700" />

              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-slate-300 mb-1">
                  Your Name
                </label>
                <input
                  id="adminName"
                  type="text"
                  value={form.adminName}
                  onChange={(e) => update("adminName", e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="adminEmail"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Admin Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => update("adminEmail", e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="adminPassword"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Password
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={form.adminPassword}
                  onChange={(e) => update("adminPassword", e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
