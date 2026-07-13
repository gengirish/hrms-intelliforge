import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  Search,
  Star,
  Wallet,
  Briefcase,
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
  { value: "500+", label: "Mentor-led internships run" },
  { value: "< 2 min", label: "List your first cohort" },
  { value: "60s", label: "Per-intern onboarding" },
];

const features = [
  {
    icon: Search,
    title: "Mentor roster",
    description:
      "Invite your program mentors, organize them by skill and availability, and assign them to cohorts from one workspace.",
  },
  {
    icon: Briefcase,
    title: "Cohort listings",
    description:
      "Publish internship openings with stipend details, duration, and mentor assignments. Share your org careers page in one link.",
  },
  {
    icon: Star,
    title: "Ratings & accountability",
    description:
      "Two-way reviews after each cohort. Mentor and intern scores build accountability across your program.",
  },
  {
    icon: Wallet,
    title: "Stipend payouts",
    description:
      "Collect stipends upfront, pay mentors and interns on schedule — with a transparent platform fee.",
  },
  {
    icon: Clock,
    title: "Attendance & task tracking",
    description:
      "One-tap punch in/out, weekly task logs, and automated nudges via email and WhatsApp.",
  },
  {
    icon: BarChart3,
    title: "Cohort analytics",
    description:
      "Progress dashboards, attrition alerts, and mentor review scores — see who's thriving before demo day.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your workspace",
    description:
      "Sign up free, set up your program, and invite mentors. No sales call — live in minutes.",
  },
  {
    step: "02",
    title: "Onboard your cohort",
    description:
      "Assign mentors to interns. Candidates apply, accept offers, and self-onboard in one flow.",
  },
  {
    step: "03",
    title: "Run cohorts & get paid",
    description:
      "Track accountability, collect ratings, and process stipend payouts — all from one dashboard.",
  },
];

const logos = [
  "Mentor networks",
  "AI bootcamps",
  "Startup accelerators",
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
                <span>Internal programs · Cohort ops · Built in India</span>
              </div>

              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
              >
                <span className="text-white">The Mentor Internship Platform</span>
                <br />
                <span className="gradient-text">run cohorts, track accountability, get paid</span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 max-w-2xl leading-relaxed">
                Run your mentor-led internship program in one auditable workspace.
                Invite mentors, onboard interns, track attendance, collect
                ratings, and process stipend payouts with a transparent platform
                fee. Self-serve signup — live in minutes.
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
                  Mentor ratings & reviews
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                  Stipend payouts built in
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
              Program operations
            </p>
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl font-bold text-white text-balance"
            >
              From mentor roster to stipend payout
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Stop duct-taping spreadsheets, WhatsApp groups, and manual payouts.
              One platform for running cohorts, assigning mentors, tracking
              accountability, and paying stipends.
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
              Your next cohort deserves mentors, not spreadsheets
            </h2>
            <p className="mt-4 text-slate-300">
              Join teams running mentor-led internships on the Mentor Internship
              Platform. Free forever for up to 5 interns and 2 mentors.
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
