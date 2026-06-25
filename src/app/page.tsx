import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  UserPlus,
  Clock,
  FileSignature,
  Bell,
  BarChart3,
  Zap,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { DemoVideo } from "@/components/marketing/demo-video";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";

const stats = [
  { value: "500+", label: "Intern cohort we run on HRMS" },
  { value: "< 2 min", label: "Workspace setup" },
  { value: "60s", label: "Per-intern onboarding" },
];

const features = [
  {
    icon: UserPlus,
    title: "Self-serve onboarding",
    description:
      "Interns submit documents, accept offers, and get activated — without HR chasing spreadsheets.",
  },
  {
    icon: Clock,
    title: "Attendance that sticks",
    description:
      "One-tap punch in/out with WFH mode. Automated weekday nudges via email and WhatsApp.",
  },
  {
    icon: FileSignature,
    title: "Offer letters on autopilot",
    description:
      "Generate PDF offers, track acceptance on email or WhatsApp, and activate in one click.",
  },
  {
    icon: Bell,
    title: "Dual-channel notifications",
    description:
      "AgentMail + WhatsApp Business with delivery tracking and audit-ready history.",
  },
  {
    icon: BarChart3,
    title: "Weekly progress & analytics",
    description:
      "Task logs, mentor reviews, and score dashboards — see who's thriving before demo day.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp-native ops",
    description:
      "Attendance nudges, offer acceptances, and cohort reminders where interns already are — not lost in email threads.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your workspace",
    description: "Sign up free, name your org, invite mentors. No sales call.",
  },
  {
    step: "02",
    title: "Hire & onboard",
    description:
      "Publish your careers page. Send offers on WhatsApp or email; interns self-onboard in one flow.",
  },
  {
    step: "03",
    title: "Run the cohort",
    description:
      "Attendance, tasks, and weekly scores on autopilot — with nudges on WhatsApp and email.",
  },
];

const logos = [
  "AI bootcamps",
  "Startup accelerators",
  "Consulting firms",
  "University programs",
  "Enterprise L&D",
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="max-w-3xl">
              <div className="badge-trust mb-6 animate-stat-reveal inline-flex">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Internship OS · WhatsApp-native · Built in India</span>
              </div>

              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
              >
                <span className="text-white">Run intern cohorts on WhatsApp + email</span>
                <br />
                <span className="gradient-text">without the spreadsheet chaos</span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 max-w-2xl leading-relaxed">
                IntelliForge HRMS is the internship OS for cohort-based programs —
                hire, onboard, track attendance, and score weekly progress in one
                auditable workspace. Nudges and offers go out on WhatsApp and
                email. Spot attrition risk before demo day. Self-serve signup;
                live in minutes.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-start gap-3">
                <Link href="/create-org" className="btn-cta px-6 py-3 text-base">
                  Start free — 5 interns
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/pricing" className="btn-secondary px-6 py-3 text-base">
                  View pricing
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                  No credit card
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                  Attrition alerts before demo day
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                  Email + WhatsApp
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-label="Trusted by program types"
          className="border-y border-slate-800 bg-slate-900/40"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-xs uppercase tracking-wider text-slate-500 mb-4">
              Built for teams like yours
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {logos.map((name) => (
                <li key={name} className="text-sm font-medium text-slate-400">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-label="Product metrics"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12"
        >
          <dl className="grid grid-cols-3 gap-3 sm:gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md py-6 px-4 sm:px-8 shadow-trust-card">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center"
              >
                <dt className="order-2 mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-slate-400">
                  {stat.label}
                </dt>
                <dd className="order-1 text-2xl sm:text-3xl font-bold text-white animate-metric-pulse">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="demo-heading"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-slate-800/60"
        >
          <div className="mb-10 text-center">
            <h2
              id="demo-heading"
              className="text-2xl sm:text-3xl font-bold text-white"
            >
              See it in 60 seconds
            </h2>
          </div>
          <DemoVideo />
        </section>

        <section
          aria-labelledby="features-heading"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
        >
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-400 mb-3">
              Everything in one product
            </p>
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl font-bold text-white text-balance"
            >
              Replace five tools with one internship OS
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Stop duct-taping Google Sheets, WhatsApp groups, and manual PDFs.
              HRMS gives program managers a single source of truth — and gives
              interns a polished self-serve portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <article key={feature.title} className="trust-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/30 mb-4">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="how-it-works-heading"
          className="border-y border-slate-800 bg-slate-900/30"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-400 mb-3">
                How it works
              </p>
              <h2
                id="how-it-works-heading"
                className="text-3xl sm:text-4xl font-bold text-white"
              >
                Launch your cohort in three steps
              </h2>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((item) => (
                <li key={item.step} className="relative">
                  <span className="text-4xl font-bold text-brand-500/20">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-12 text-center">
              <Link href="/create-org" className="btn-primary px-6 py-3">
                <Zap className="h-4 w-4" aria-hidden="true" />
                Create your workspace
              </Link>
            </div>
          </div>
        </section>

        <SocialProof />

        <PricingSection />

        <section
          aria-labelledby="intern-portal-heading"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
        >
          <div className="trust-card p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 mb-4">
                <MessageSquare className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                Already enrolled in a program?
              </div>
              <h2
                id="intern-portal-heading"
                className="text-2xl sm:text-3xl font-bold text-white"
              >
                Intern self-service portal
              </h2>
              <p className="mt-3 text-slate-400 leading-relaxed">
                Onboard, log attendance, submit tasks, and view your offer —
                no admin account needed.
              </p>
              <ul className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                {[
                  { href: "/intern-onboarding", label: "Onboarding" },
                  { href: "/attendance", label: "Attendance" },
                  { href: "/tasks", label: "Tasks" },
                  { href: "/offer", label: "Offer letter" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-md border border-slate-700 px-2.5 py-1 hover:border-brand-500/50 hover:text-brand-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/sign-in" className="btn-secondary px-5 py-2.5">
                Intern sign in
              </Link>
              <Link href="/intern-onboarding" className="btn-primary px-5 py-2.5">
                Start onboarding
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="final-cta-heading"
          className="relative overflow-hidden border-t border-slate-800"
        >
          <div className="absolute inset-0 gradient-hero opacity-60" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <ShieldCheck
              className="h-10 w-10 text-brand-400 mx-auto mb-4"
              aria-hidden="true"
            />
            <h2
              id="final-cta-heading"
              className="text-2xl sm:text-3xl font-bold text-white text-balance"
            >
              Your next cohort deserves better than spreadsheets
            </h2>
            <p className="mt-4 text-slate-300">
              Join teams running internship programs on IntelliForge HRMS.
              Free forever for up to 5 interns.
            </p>
            <Link href="/create-org" className="btn-cta mt-8 px-8 py-3 text-base">
              Start free today
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
