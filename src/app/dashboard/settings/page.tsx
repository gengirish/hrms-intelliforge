"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  Settings,
  Loader2,
  Save,
  ExternalLink,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { cn } from "@/lib/utils";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  plan: string;
  maxInterns: number;
  whatsappPhoneId: string | null;
  agentmailEmail: string | null;
  createdAt: string;
  _count: { interns: number; admins: number };
}

const PLANS = [
  { key: "free", name: "Free", price: "$0/mo", interns: 5, current: false },
  { key: "starter", name: "Starter", price: "$29/mo", interns: 25, current: false },
  { key: "growth", name: "Growth", price: "$79/mo", interns: 100, current: false },
  { key: "enterprise", name: "Enterprise", price: "Custom", interns: "Unlimited", current: false },
];

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "billing" | "integrations">("general");
  const [editForm, setEditForm] = useState({ name: "", logoUrl: "" });

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    try {
      const res = await fetch("/api/org");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrg(data.org);
      setEditForm({ name: data.org.name, logoUrl: data.org.logoUrl || "" });
    } catch {
      toast.error("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveOrg() {
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          logoUrl: editForm.logoUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
      await loadOrg();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout(plan: string) {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    }
  }

  async function handlePortal() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <Building2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">No Organization</h1>
            <p className="text-sm text-slate-400 mt-2">
              You need to be part of an organization to access settings.
            </p>
            <Link href="/create-org" className="inline-block mt-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
              Create Organization
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
        <Breadcrumbs className="mb-4" />
        <DashboardSubnav className="mb-6" />
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
            <p className="text-sm text-slate-400">{org.name} &middot; {org.slug}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-slate-800">
          {([
            { key: "general", label: "General", icon: Settings },
            { key: "billing", label: "Billing", icon: CreditCard },
            { key: "integrations", label: "Integrations", icon: Building2 },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                activeSection === tab.key
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection === "general" && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Organization Details</h3>
              <div>
                <label htmlFor="org-name" className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  id="org-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label htmlFor="org-logo" className="block text-sm text-slate-400 mb-1">Logo URL</label>
                <input
                  id="org-logo"
                  type="text"
                  value={editForm.logoUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {org._count.interns} interns (unlimited)
                  </span>
                  <span>{org._count.admins} admin(s)</span>
                </div>
                <button
                  onClick={saveOrg}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors inline-flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "billing" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Current Plan</h3>
                  <p className="text-lg font-bold text-indigo-400 capitalize">{org.plan}</p>
                </div>
                {org.plan !== "free" && (
                  <button
                    onClick={handlePortal}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage Billing
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.key === org.plan;
                return (
                  <div
                    key={plan.key}
                    className={cn(
                      "glass-card p-5 flex flex-col",
                      isCurrent && "ring-2 ring-indigo-500"
                    )}
                  >
                    <h4 className="text-sm font-semibold text-white">{plan.name}</h4>
                    <p className="text-xl font-bold text-white mt-1">{plan.price}</p>
                    <p className="text-xs text-slate-400 mt-2">Up to {plan.interns} interns</p>
                    <div className="mt-auto pt-4">
                      {isCurrent ? (
                        <span className="block text-center text-xs font-medium text-indigo-400">
                          Current Plan
                        </span>
                      ) : plan.key === "free" ? null : (
                        <button
                          onClick={() => handleCheckout(plan.key)}
                          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition-colors"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === "integrations" && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">WhatsApp Business API</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Phone Number ID</span>
                <span className="text-white">{org.whatsappPhoneId || "Not configured"}</span>
              </div>
            </div>
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">AgentMail</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Email</span>
                <span className="text-white">{org.agentmailEmail || "Not configured"}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
