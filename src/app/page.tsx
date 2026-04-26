import Link from "next/link";
import {
  UserPlus,
  Clock,
  ClipboardList,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";

const actions = [
  {
    href: "/intern-onboarding",
    icon: UserPlus,
    title: "Intern Onboarding",
    description:
      "Self-onboarding for new interns — submit your details and documents in minutes.",
    cta: "Get started",
  },
  {
    href: "/attendance",
    icon: Clock,
    title: "Attendance",
    description:
      "Log daily attendance with a single tap — punch in/out, WFH or office mode.",
    cta: "Log now",
  },
  {
    href: "/tasks",
    icon: ClipboardList,
    title: "My Tasks",
    description:
      "Submit weekly task logs with hours tracked per task and project.",
    cta: "View tasks",
  },
];

const stats = [
  { value: "500+", label: "Interns onboarded" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 60s", label: "Onboarding time" },
];

const trustPoints = [
  "Encrypted offer letters & document uploads",
  "Email + WhatsApp delivery tracking",
  "Audit-ready notification history",
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="badge-trust mb-6 animate-stat-reveal">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>IntelliForge AI · Internship Program 2026</span>
            </div>

            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
            >
              <span className="text-white">IntelliForge HRMS</span>
              <br />
              <span className="gradient-text">Intern Portal</span>
            </h1>

            <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
              Streamlined onboarding, attendance tracking, task management, and
              offer letter generation — built for the AI internship program.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/intern-onboarding"
                className="btn-cta px-6 py-3 text-base"
              >
                Start Onboarding
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary px-6 py-3 text-base"
              >
                Admin Dashboard
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-brand-400"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-label="Program metrics"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6"
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
          aria-labelledby="actions-heading"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
        >
          <div className="mb-10 text-center">
            <h2
              id="actions-heading"
              className="text-2xl sm:text-3xl font-bold text-white"
            >
              What would you like to do today?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Pick an action to get started — interns can self-serve, admins
              manage everything from the dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                aria-label={`${action.title} — ${action.cta}`}
                className="trust-card p-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/30 mb-4 transition-colors group-hover:bg-brand-500/20 group-hover:text-brand-200">
                  <action.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                  {action.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 group-hover:text-brand-200 transition-colors">
                  {action.cta}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
