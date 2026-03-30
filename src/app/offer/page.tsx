"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Briefcase,
  Calendar,
  Clock,
  IndianRupee,
  Download,
  ExternalLink,
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
  const [loading, setLoading] = useState(true);
  const [intern, setIntern] = useState<InternOffer | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNeedsOnboarding(false);
      setIntern(null);
      try {
        const res = await fetch("/api/offer");
        if (res.status === 401) {
          if (!cancelled) setNeedsOnboarding(true);
          return;
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Could not load offer");
        }
        const data = await res.json();
        if (!cancelled) setIntern(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Could not load offer";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAccept() {
    if (!intern) return;
    setAccepting(true);
    try {
      const res = await fetch("/api/offer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
            View your internship offer while signed in. Accept when you are ready.
          </p>
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <FileText className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-indigo-300">
              Your PDF offer letter is sent when an admin clicks <strong>Send Offer</strong> in the dashboard (via <strong>AgentMail</strong>). Accepting here only updates your status—it does not email the PDF.
            </p>
          </div>
        </div>

        {loading && (
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading your offer…</p>
          </div>
        )}

        {!loading && needsOnboarding && (
          <div className="glass-card p-8 text-center">
            <FileText className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              Please complete onboarding first to see your offer.
            </p>
            <Link
              href="/onboard"
              className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 font-semibold text-white transition-all"
            >
              Go to onboarding
            </Link>
          </div>
        )}

        {!loading && !needsOnboarding && intern && !accepted && (
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

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/api/offer/pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-5 py-3 font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Offer Letter PDF
              </a>
              <a
                href="/api/offer/pdf"
                download
                className="flex-1 rounded-lg border border-slate-600 hover:bg-slate-800 px-5 py-3 font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
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
                    Accept Offer
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

            {intern.status === "COMPLETED" && (
              <div className="flex flex-col gap-2 p-5 rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 border border-violet-500/25">
                <CheckCircle2 className="h-8 w-8 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">
                  Your internship is complete!
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Thank you for your time at IntelliForge AI.
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
              Welcome to IntelliForge AI! Your acceptance has been recorded. If you need your PDF offer letter, check the email from when your admin sent it, or ask them to resend from the dashboard.
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
