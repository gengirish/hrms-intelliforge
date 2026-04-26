import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Award,
  Heart,
  Zap,
  Users,
  Target,
  GraduationCap,
  Briefcase,
  MapPin,
  Globe,
  ExternalLink,
  ArrowRight,
  Bot,
  BookOpen,
  Workflow,
  Palette,
  Rocket,
  UserPlus,
  Clock,
  ClipboardList,
  Mail,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet the team behind IntelliForge HRMS — a product of IntelliForge AI, founded by Girish Hiremath in Hyderabad, India. Aligned with the Bharat AI Mission to democratize AI for India.",
  openGraph: {
    title: "About IntelliForge HRMS",
    description:
      "A product of IntelliForge AI — founded by Girish Hiremath, an AI Practitioner with 14+ years of enterprise experience. Aligned with the Bharat AI Mission.",
    type: "website",
  },
};

const PARENT_URL = "https://www.intelliforge.tech";
const FOUNDER_URL = "https://girishbhiremath.vercel.app";
const FOUNDER_EMAIL = "gen.girish@gmail.com";

const productPillars = [
  {
    icon: UserPlus,
    title: "Onboarding",
    description:
      "Self-serve intern onboarding with document uploads, e-signed offer letters and audit-ready trails.",
  },
  {
    icon: Clock,
    title: "Attendance",
    description:
      "One-tap punch in / out, WFH or office mode, with weekly summaries and exception alerts.",
  },
  {
    icon: ClipboardList,
    title: "Hiring & Tasks",
    description:
      "Job postings, candidate pipelines, and weekly task logs — all wired into the same tenant.",
  },
];

const fiveLevels = [
  {
    n: "01",
    icon: BookOpen,
    title: "AI Foundations & Training",
    blurb: "Learn to speak AI's language.",
  },
  {
    n: "02",
    icon: Workflow,
    title: "AI Workflow Automation",
    blurb: "Connect AI to your entire business.",
  },
  {
    n: "03",
    icon: Palette,
    title: "AI Creative Studio",
    blurb: "Become a one-person agency.",
  },
  {
    n: "04",
    icon: Bot,
    title: "AI Agent Development",
    blurb: "Your 24/7 digital workforce.",
  },
  {
    n: "05",
    icon: Rocket,
    title: "AI App Development",
    blurb: "Vibe coding — build without limits.",
  },
];

const industries = [
  "Banking & Finance",
  "Pharma & Healthcare",
  "Telecom",
  "Enterprise SaaS",
  "IoT",
  "E-commerce",
];

const founderStats = [
  { value: "14+", label: "Years experience" },
  { value: "12+", label: "Projects shipped" },
  { value: "6+", label: "Industries" },
];

const founderClients = [
  "Fortune 500 Life Sciences",
  "Global Banking Corporation",
  "Major US Financial Institution",
  "Top-4 US Investment Bank",
  "Global Telecom Leader",
  "Semiconductor & IoT leader",
];

const sisterProducts = [
  "Multi-Agent Deep Research",
  "AI Digital Profile",
  "Markdown to PDF Converter",
  "YouTube Transcript Scraper",
  "MoveMore",
  "Interview Bot",
  "IntelliForge Learning",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* ─────────────────────────────  HERO  ───────────────────────────── */}
        <section
          aria-labelledby="about-hero-heading"
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-20 sm:pt-14 sm:pb-28">
            <Breadcrumbs className="mb-8" />

            <div className="text-center">
              <div className="badge-trust mb-6 animate-stat-reveal">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>About · IntelliForge HRMS</span>
              </div>

              <h1
                id="about-hero-heading"
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance text-white"
              >
                A Human Resource platform{" "}
                <span className="gradient-text">Built for the AI age</span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                IntelliForge HRMS is the people-operations layer for{" "}
                <span className="text-white font-medium">IntelliForge AI</span>{" "}
                — purpose-built to onboard, manage and empower the next
                generation of AI builders. Engineered in India, aligned with the{" "}
                <span className="text-white font-medium">
                  Bharat AI Mission
                </span>
                , and shipped with enterprise-grade trust.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/sign-in"
                  className="btn-primary px-6 py-3 text-base"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href={PARENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3 text-base"
                >
                  Visit Parent Co
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────  WHAT IS HRMS  ─────────────────────── */}
        <section
          aria-labelledby="what-is-hrms-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
        >
          <div className="max-w-3xl">
            <h2
              id="what-is-hrms-heading"
              className="text-2xl sm:text-3xl font-bold text-white"
            >
              What is IntelliForge HRMS?
            </h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              IntelliForge HRMS is a multi-tenant Human Resource Management
              System designed for AI-first teams. We replace the spreadsheet
              sprawl of traditional internship and HR programs with a single,
              auditable workspace — onboarding, attendance, task management,
              hiring and offer-letter automation — wired together with the same
              AI agents we ship for enterprise clients.
            </p>
            <p className="mt-3 text-slate-400 leading-relaxed">
              It is the operating system for the IntelliForge AI internship
              cohort, and a reference implementation of how a modern,
              India-first SaaS product should feel.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {productPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="trust-card p-6 focus-within:ring-2 focus-within:ring-brand-500"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/30 mb-4">
                  <pillar.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────  PARENT — INTELLIFORGE AI  ──────────────────── */}
        <section
          aria-labelledby="parent-co-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20"
        >
          <div className="trust-card p-6 sm:p-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-brand-glow">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-300">
                    Parent Company
                  </p>
                  <h2
                    id="parent-co-heading"
                    className="mt-1 text-2xl sm:text-3xl font-bold text-white"
                  >
                    IntelliForge AI
                  </h2>
                  <p className="mt-2 text-slate-300 max-w-2xl">
                    “We Build AI Agents, Automate Workflows &amp; Ship AI Apps —
                    In Weeks, Not Months.”
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="badge-trust">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Aligned with Bharat AI Mission</span>
                </span>
                <span className="badge-trust">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hyderabad, IN</span>
                </span>
              </div>
            </div>

            {/* 5-Level AI Framework */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
                The 5-Level AI Framework
              </h3>
              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {fiveLevels.map((level) => (
                  <li
                    key={level.n}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-brand-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-[11px] font-bold tracking-wider text-brand-300"
                        aria-hidden="true"
                      >
                        LEVEL {level.n}
                      </span>
                      <level.icon
                        className="h-4 w-4 text-slate-500"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">
                      {level.title}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                      {level.blurb}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Industries served */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Industries Served
              </h3>
              <ul className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <li
                    key={industry}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
                  >
                    {industry}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sister products */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Products from the IntelliForge stable
              </h3>
              <ul className="flex flex-wrap gap-2">
                {sisterProducts.map((p) => (
                  <li
                    key={p}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 px-3 py-1 text-xs font-medium text-brand-200"
                  >
                    <Zap className="h-3 w-3" aria-hidden="true" />
                    {p}
                  </li>
                ))}
                <li className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 border border-accent-500/40 px-3 py-1 text-xs font-semibold text-accent-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  IntelliForge HRMS
                  <span className="text-accent-400/80">(this product)</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <a
                href={PARENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200 transition-colors rounded-md px-1 -mx-1 cursor-pointer"
              >
                Visit IntelliForge AI
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* ─────────────────────────  FOUNDER  ───────────────────────── */}
        <section
          aria-labelledby="founder-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20"
        >
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-300">
              Founder
            </p>
            <h2
              id="founder-heading"
              className="mt-1 text-2xl sm:text-3xl font-bold text-white"
            >
              Meet Girish Hiremath
            </h2>
          </div>

          <div className="trust-card p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-8 md:gap-10">
              {/* Left — avatar + identity */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span
                  aria-hidden="true"
                  className="flex h-28 w-28 items-center justify-center rounded-full gradient-brand text-3xl font-bold text-white shadow-brand-glow ring-2 ring-brand-500/30"
                >
                  GH
                </span>
                <h3 className="mt-5 text-xl font-bold text-white">
                  Girish Hiremath
                </h3>
                <p className="mt-1 text-sm font-medium text-brand-300">
                  AI Practitioner &amp; Founder
                </p>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  Principal Software Engineer at a Compliance &amp; RegTech
                  company in Hyderabad.
                </p>

                <div className="mt-5 w-full rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <GraduationCap
                      className="h-4 w-4 mt-0.5 text-brand-300 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="text-xs text-slate-300 leading-relaxed">
                      <p className="font-semibold text-white">
                        M.Tech, Data Science &amp; AI
                      </p>
                      <p className="text-slate-400">
                        IIIT Dharwad — Institute of National Importance
                      </p>
                      <p className="text-slate-500 mt-1">March 2026 onwards</p>
                    </div>
                  </div>
                </div>

                <a
                  href={FOUNDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 hover:text-brand-200 transition-colors rounded-md px-1 -mx-1 cursor-pointer"
                >
                  View full portfolio
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>

              {/* Right — bio + stats + history */}
              <div>
                <div className="space-y-4 text-slate-300 leading-relaxed">
                  <p>
                    Girish has spent{" "}
                    <span className="text-white font-semibold">
                      14+ years building enterprise software
                    </span>{" "}
                    across six industries — Compliance &amp; RegTech, Banking,
                    FinTech, Pharma, Telecom and IoT — and has delivered
                    production systems for Fortune-500 life-sciences companies,
                    a top-4 US investment bank, and a global telecom leader.
                  </p>
                  <p className="text-slate-400">
                    His earliest brush with AI came years before the GenAI wave
                    — a{" "}
                    <span className="text-slate-200 font-medium">
                      Hindi Reader Android app
                    </span>{" "}
                    powered by OpenCV and Artificial Neural Networks, presented
                    at a developer conference. Today, that same instinct drives
                    IntelliForge AI: pragmatic, ship-fast, real-world AI for
                    real businesses.
                  </p>
                  <p className="text-slate-400">
                    Most recently, he completed the{" "}
                    <span className="text-slate-200 font-medium">
                      AI Engineering Accelerator Program (Outskill, Dec 2025)
                    </span>{" "}
                    — covering RAG, LangChain / LlamaIndex and AI Agents — and
                    is now pursuing his M.Tech in Data Science &amp; AI at IIIT
                    Dharwad alongside leading IntelliForge.
                  </p>
                </div>

                {/* Stats */}
                <dl className="mt-7 grid grid-cols-3 gap-3 sm:gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
                  {founderStats.map((s) => (
                    <div
                      key={s.label}
                      className="flex flex-col items-center text-center"
                    >
                      <dt className="order-2 mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-slate-400">
                        {s.label}
                      </dt>
                      <dd className="order-1 text-2xl sm:text-3xl font-bold text-white animate-metric-pulse">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Past clients */}
                <div className="mt-7">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Briefcase
                      className="h-4 w-4 text-brand-300"
                      aria-hidden="true"
                    />
                    Trusted by enterprises across industries
                  </h4>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {founderClients.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-sm text-slate-400"
                      >
                        <Award
                          className="h-3.5 w-3.5 mt-1 text-accent-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Coursework chips */}
                <div className="mt-7">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <BookOpen
                      className="h-4 w-4 text-brand-300"
                      aria-hidden="true"
                    />
                    Current coursework
                  </h4>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Deep Learning",
                      "NLP",
                      "Generative AI",
                      "Computer Vision",
                      "Financial Analytics",
                      "AI in Healthcare",
                    ].map((course) => (
                      <li
                        key={course}
                        className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                      >
                        {course}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────  BHARAT AI MISSION ALIGNMENT  ─────────────────── */}
        <section
          aria-labelledby="bharat-ai-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20"
        >
          <div className="trust-card p-6 sm:p-10 relative overflow-hidden">
            <div
              className="absolute inset-0 gradient-hero opacity-60 pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 md:gap-8 items-start">
              <div className="flex md:flex-col gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/30">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  <Globe className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-accent-300">
                  Mission &amp; Origin
                </p>
                <h2
                  id="bharat-ai-heading"
                  className="mt-1 text-2xl sm:text-3xl font-bold text-white"
                >
                  Aligned with the Bharat AI Mission
                </h2>
                <p className="mt-4 text-slate-300 leading-relaxed max-w-3xl">
                  IntelliForge AI is built in lock-step with the{" "}
                  <span className="text-white font-semibold">
                    ₹10,372 crore IndiaAI Mission
                  </span>{" "}
                  — a national initiative to democratise AI for India. Our
                  mandate is simple: make production-grade AI accessible to
                  Indian businesses, students and the next generation of
                  builders.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                    <Target
                      className="h-4 w-4 text-brand-300"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-semibold text-white">
                      India-first
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Built for Indian businesses, regulators and use-cases.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                    <Users
                      className="h-4 w-4 text-brand-300"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-semibold text-white">
                      Talent-first
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Real internships, real projects, shipped to real users.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                    <MapPin
                      className="h-4 w-4 text-brand-300"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-semibold text-white">
                      Hyderabad, India
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Headquartered in the city of pearls — Telangana, IN.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────  GET IN TOUCH  ───────────────────────── */}
        <section
          aria-labelledby="contact-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28"
        >
          <div className="trust-card p-6 sm:p-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/30 mb-4">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2
              id="contact-heading"
              className="text-2xl sm:text-3xl font-bold text-white"
            >
              Get in touch
            </h2>
            <p className="mt-3 text-slate-300 max-w-xl mx-auto leading-relaxed">
              Want to partner, hire interns, or build an AI product with us?
              We&apos;d love to hear from you.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`mailto:${FOUNDER_EMAIL}`}
                className="btn-cta px-6 py-3 text-base"
                aria-label={`Email Girish at ${FOUNDER_EMAIL}`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {FOUNDER_EMAIL}
              </a>
              <a
                href={PARENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-6 py-3 text-base"
              >
                Visit IntelliForge AI
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              IntelliForge HRMS · A product of{" "}
              <a
                href={PARENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-brand-300 underline-offset-2 hover:underline"
              >
                IntelliForge AI
              </a>
              {" · "}
              Founded by{" "}
              <a
                href={FOUNDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-brand-300 underline-offset-2 hover:underline"
              >
                Girish Hiremath
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
