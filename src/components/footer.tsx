import Link from "next/link";
import { ShieldCheck, Mail, MapPin } from "lucide-react";

const quickLinks = [
  { href: "/careers", label: "Careers" },
  { href: "/intern-onboarding", label: "Intern Onboarding" },
  { href: "/attendance", label: "Attendance" },
  { href: "/tasks", label: "Tasks" },
  { href: "/offer", label: "Offer Letter" },
];

const externalLinks = [
  { href: "https://www.intelliforge.tech", label: "IntelliForge AI" },
  { href: "https://learning.intelliforge.tech", label: "Learning Portal" },
  { href: "https://upskill.intelliforge.tech", label: "AI Bootcamp" },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Encrypted in transit & at rest" },
  { icon: Mail, label: "AgentMail-verified communications" },
  { icon: MapPin, label: "Bengaluru, India" },
];

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-800 bg-slate-950"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand font-bold text-white text-sm shadow-brand-glow">
                IF
              </span>
              <span className="text-lg font-semibold text-white">
                IntelliForge{" "}
                <span className="text-slate-400 font-normal">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              IntelliForge HRMS — Streamlined intern management for the AI age.
            </p>
            <ul className="mt-5 space-y-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-xs text-slate-500"
                >
                  <Icon
                    className="h-3.5 w-3.5 text-brand-400"
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              IntelliForge
            </h3>
            <ul className="space-y-2">
              {externalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; 2026 IntelliForge AI. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Built with care in Bengaluru · v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
