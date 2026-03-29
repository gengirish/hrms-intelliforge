"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Search,
  Briefcase,
  Calendar,
  Clock,
  IndianRupee,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { formatINR, formatDateIST } from "@/lib/utils";

interface InternOffer {
  id: string;
  name: string;
  role: string;
  stipendPaise: number;
  startDate: string;
  durationWeeks: number;
  mentorId: string | null;
  status: string;
  college: string;
}

export default function OfferPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [intern, setIntern] = useState<InternOffer | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function lookupOffer() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/offer?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Offer not found");
      }
      const data = await res.json();
      setIntern(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not find offer";
      toast.error(message);
      setIntern(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!intern) return;
    setAccepting(true);
    try {
      const res = await fetch("/api/offer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId: intern.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to accept");
      }
      setAccepted(true);
      toast.success("Offer accepted! Welcome to IntelliForge AI.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Offer Letter</h1>
          <p className="mt-2 text-slate-400">
            Enter your email to view your internship offer details.
          </p>
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <FileText className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-indigo-300">
              After accepting, your signed PDF offer letter will be emailed to you automatically via <strong>AgentMail</strong>.
            </p>
          </div>
        </div>

        {/* Email Lookup */}
        <div className="glass-card p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupOffer()}
              className="flex-1 rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              placeholder="Enter your email address"
            />
            <button
              onClick={lookupOffer}
              disabled={loading || !email}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Look Up
            </button>
          </div>
        </div>

        {/* Offer Details */}
        {intern && !accepted && (
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">
                Offer Details for {intern.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50">
                <Briefcase className="h-5 w-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-slate-400">Role</p>
                  <p className="text-sm font-medium text-white">{intern.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50">
                <IndianRupee className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs text-slate-400">Monthly Stipend</p>
                  <p className="text-sm font-medium text-white">
                    {formatINR(intern.stipendPaise)}/month
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50">
                <Calendar className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-xs text-slate-400">Start Date</p>
                  <p className="text-sm font-medium text-white">
                    {formatDateIST(intern.startDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50">
                <Clock className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-xs text-slate-400">Duration</p>
                  <p className="text-sm font-medium text-white">
                    {intern.durationWeeks} weeks
                  </p>
                </div>
              </div>
            </div>

            {intern.status === "OFFERED" && (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept &amp; Sign
                  </>
                )}
              </button>
            )}

            {intern.status === "ACTIVE" && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                  You have already accepted this offer.
                </p>
              </div>
            )}

            {intern.status === "PENDING" && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
                <p className="text-sm text-yellow-300">
                  Your offer letter is being prepared. Please check back soon.
                </p>
              </div>
            )}
          </div>
        )}

        {accepted && (
          <div className="glass-card p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Offer Accepted!
            </h2>
            <p className="text-slate-400">
              Welcome to IntelliForge AI! Your offer letter PDF has been generated and emailed to you via <strong>AgentMail</strong> — check your inbox!
            </p>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
