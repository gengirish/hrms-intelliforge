import Link from "next/link";
import { UserPlus, Clock, ClipboardList } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";

const actions = [
  {
    href: "/intern-onboarding",
    icon: UserPlus,
    title: "Intern Onboarding",
    description: "Self-onboarding for new interns — submit your details and documents.",
    cta: "Get started",
  },
  {
    href: "/attendance",
    icon: Clock,
    title: "Attendance",
    description: "Log daily attendance with punch-in/out, WFH or office mode.",
    cta: "Log now",
  },
  {
    href: "/tasks",
    icon: ClipboardList,
    title: "My Tasks",
    description: "Submit weekly task logs with hours tracked per task.",
    cta: "View tasks",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-950 to-indigo-600/10" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-6">
              <span className="text-xs font-medium text-indigo-400">IntelliForge AI</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="text-white">IntelliForge HRMS</span>
              <br />
              <span className="gradient-text">Intern Portal</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
              Streamlined onboarding, attendance tracking, task management, and
              offer letter generation for IntelliForge AI interns.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/intern-onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                Start Onboarding
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-all"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="glass-card p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <action.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{action.description}</p>
                <span className="text-sm font-medium text-indigo-400 group-hover:text-blue-300 transition-colors">
                  {action.cta} &rarr;
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
