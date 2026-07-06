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
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { DASHBOARD_PLANS } from "@/lib/pricing";

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


interface TeamAdminRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  menteeCount: number;
}

interface InternPick {
  id: string;
  name: string;
  email: string;
  deactivated?: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "general" | "team" | "billing" | "integrations"
  >("general");
  const [editForm, setEditForm] = useState({ name: "", logoUrl: "" });
  const [team, setTeam] = useState<TeamAdminRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "MENTOR" as "MENTOR" | "ADMIN",
  });
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    internId: "",
    role: "MENTOR" as "MENTOR" | "ADMIN",
  });
  const [internsPick, setInternsPick] = useState<InternPick[]>([]);

  useEffect(() => {
    loadOrg();
  }, []);

  useEffect(() => {
    if (activeSection !== "team" || !org) return;
    let cancelled = false;
    (async () => {
      setTeamLoading(true);
      try {
        const [tRes, iRes] = await Promise.all([
          fetch("/api/org/admins"),
          fetch("/api/dashboard"),
        ]);
        if (cancelled) return;
        if (tRes.ok) {
          const d = await tRes.json();
          setTeam(d.admins ?? []);
        }
        if (iRes.ok) {
          const d = await iRes.json();
          const list = (d.interns ?? []) as InternPick[];
          setInternsPick(list.filter((i) => !i.deactivated));
        }
      } catch {
        toast.error("Failed to load team");
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, org]);

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

  async function inviteTeamMember() {
    setInviteBusy(true);
    try {
      const res = await fetch("/api/org/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          name: inviteForm.name.trim() || undefined,
          role: inviteForm.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Invite failed");
        return;
      }
      toast.success(data.message || "Invite email sent.");
      setInviteForm({ email: "", name: "", role: "MENTOR" });
      const tRes = await fetch("/api/org/admins");
      if (tRes.ok) {
        const d = await tRes.json();
        setTeam(d.admins ?? []);
      }
      await loadOrg();
    } catch {
      toast.error("Invite failed");
    } finally {
      setInviteBusy(false);
    }
  }

  async function promoteInternToTeam() {
    if (!promoteForm.internId) {
      toast.error("Choose an intern to promote.");
      return;
    }
    setPromoteBusy(true);
    try {
      const res = await fetch("/api/org/admins/promote-intern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internId: promoteForm.internId,
          role: promoteForm.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Promotion failed");
        return;
      }
      toast.success(data.message || "Promotion invite sent.");
      setPromoteForm({ internId: "", role: "MENTOR" });
      const [tRes, iRes] = await Promise.all([
        fetch("/api/org/admins"),
        fetch("/api/dashboard"),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        setTeam(d.admins ?? []);
      }
      if (iRes.ok) {
        const d = await iRes.json();
        const list = (d.interns ?? []) as InternPick[];
        setInternsPick(list.filter((i) => !i.deactivated));
      }
      await loadOrg();
    } catch {
      toast.error("Promotion failed");
    } finally {
      setPromoteBusy(false);
    }
  }

  async function updateMemberRole(memberId: string, role: "MENTOR" | "ADMIN") {
    try {
      const res = await fetch(`/api/org/admins/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not update role");
        return;
      }
      toast.success("Role updated. Ask them to sign out and back in for navigation changes to apply.");
      setTeam((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: data.admin?.role ?? role } : m))
      );
    } catch {
      toast.error("Could not update role");
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

        <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
          {([
            { key: "general" as const, label: "General", icon: Settings },
            { key: "team" as const, label: "Team & mentors", icon: UserPlus },
            { key: "billing" as const, label: "Billing", icon: CreditCard },
            { key: "integrations" as const, label: "Integrations", icon: Building2 },
          ]).map((tab) => (
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

        {activeSection === "team" && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Invite teammate</h3>
              <p className="text-xs text-slate-400">
                Sends a secure link so they choose their own password. Choose <strong className="text-slate-300">Mentor</strong> for
                people who guide interns without billing or hiring access, or <strong className="text-slate-300">Full admin</strong> for managers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="team-invite-email" className="block text-sm text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    id="team-invite-email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="team-invite-name" className="block text-sm text-slate-400 mb-1">
                    Display name (optional)
                  </label>
                  <input
                    id="team-invite-name"
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="team-invite-role" className="block text-sm text-slate-400 mb-1">
                    Workspace role
                  </label>
                  <select
                    id="team-invite-role"
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm((p) => ({
                        ...p,
                        role: e.target.value as "MENTOR" | "ADMIN",
                      }))
                    }
                    className="w-full max-w-md rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm"
                  >
                    <option value="MENTOR">Mentor (interns & attendance)</option>
                    <option value="ADMIN">Full admin</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void inviteTeamMember()}
                disabled={inviteBusy || !inviteForm.email}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
              >
                {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Send invite email
              </button>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Promote intern to mentor or admin</h3>
              <p className="text-xs text-slate-400">
                Emails them a link to choose a password and move to a team login. Their intern access stays active until they complete the link.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="team-promote-intern" className="block text-sm text-slate-400 mb-1">
                    Intern
                  </label>
                  <select
                    id="team-promote-intern"
                    value={promoteForm.internId}
                    onChange={(e) => setPromoteForm((p) => ({ ...p, internId: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm"
                  >
                    <option value="">Select an active intern…</option>
                    {internsPick.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.email})
                      </option>
                    ))}
                  </select>
                  {internsPick.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">No active interns in this workspace.</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="team-promote-role" className="block text-sm text-slate-400 mb-1">
                    Workspace role
                  </label>
                  <select
                    id="team-promote-role"
                    value={promoteForm.role}
                    onChange={(e) =>
                      setPromoteForm((p) => ({
                        ...p,
                        role: e.target.value as "MENTOR" | "ADMIN",
                      }))
                    }
                    className="w-full max-w-md rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2 text-white text-sm"
                  >
                    <option value="MENTOR">Mentor</option>
                    <option value="ADMIN">Full admin</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void promoteInternToTeam()}
                disabled={promoteBusy || !promoteForm.internId}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
              >
                {promoteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Send promotion invite
              </button>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Team directory</h3>
              {teamLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : team.length === 0 ? (
                <p className="text-sm text-slate-400">No team members found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Email</th>
                        <th className="py-2 pr-4 font-medium">Role</th>
                        <th className="py-2 pr-4 font-medium">Mentees</th>
                        <th className="py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((m) => (
                        <tr key={m.id} className="border-b border-slate-800/80">
                          <td className="py-2 pr-4 text-white">{m.name ?? "—"}</td>
                          <td className="py-2 pr-4 text-slate-300">{m.email}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs font-medium",
                                m.role === "MENTOR"
                                  ? "bg-violet-900/50 text-violet-200"
                                  : "bg-slate-700 text-slate-200"
                              )}
                            >
                              {m.role === "MENTOR" ? "Mentor" : "Full admin"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-400">{m.menteeCount}</td>
                          <td className="py-2">
                            {m.id === user?.id ? (
                              <span className="text-xs text-slate-500">Signed in as you</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {m.role !== "MENTOR" ? (
                                  <button
                                    type="button"
                                    onClick={() => void updateMemberRole(m.id, "MENTOR")}
                                    className="text-xs rounded border border-slate-600 px-2 py-1 text-slate-300 hover:bg-slate-800"
                                  >
                                    Make mentor
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void updateMemberRole(m.id, "ADMIN")}
                                    className="text-xs rounded border border-slate-600 px-2 py-1 text-slate-300 hover:bg-slate-800"
                                  >
                                    Make full admin
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              {DASHBOARD_PLANS.map((plan) => {
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Deployment health</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    View which platform integrations have API keys configured on this server.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings/integrations"
                  className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  Open health panel
                </Link>
              </div>
            </div>
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
