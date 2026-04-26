import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  MapPin,
  ExternalLink as ExternalIcon,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const quickLinks = [
  { href: "/careers", label: "Careers" },
  { href: "/intern-onboarding", label: "Intern Onboarding" },
  { href: "/attendance", label: "Attendance" },
  { href: "/tasks", label: "Tasks" },
  { href: "/offer", label: "Offer Letter" },
];

const familyLinks: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  {
    href: "https://www.intelliforge.tech",
    label: "IntelliForge AI",
    description: "Parent company · AI agents & automation",
  },
  {
    href: "https://learning.intelliforge.tech",
    label: "Learning Portal",
    description: "AI training & cohort programs",
  },
  {
    href: "https://upskill.intelliforge.tech",
    label: "AI Bootcamp",
    description: "Hands-on upskilling programs",
  },
  {
    href: "https://girishbhiremath.vercel.app",
    label: "Founder · Girish Hiremath",
    description: "AI Practitioner · M.Tech DSAI, IIIT Dharwad",
  },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Encrypted in transit & at rest" },
  { icon: Mail, label: "AgentMail-verified communications" },
  { icon: MapPin, label: "Hyderabad, India · Bharat AI Mission aligned" },
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
            <div className="mb-4">
              <BrandMark href="/" />
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              IntelliForge HRMS — Streamlined intern management for the AI age.
              A product of{" "}
              <a
                href="https://www.intelliforge.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-300 hover:text-brand-200 font-medium"
              >
                IntelliForge AI
              </a>
              .
            </p>
            <ul className="mt-5 space-y-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-xs text-slate-500"
                >
                  <Icon
                    className="h-3.5 w-3.5 text-brand-400 shrink-0"
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
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
              <Sparkles
                className="h-3.5 w-3.5 text-brand-400"
                aria-hidden="true"
              />
              IntelliForge Family
            </h3>
            <ul className="space-y-3">
              {familyLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-md hover:bg-slate-900/60 -mx-2 px-2 py-1.5 transition-colors"
                  >
                    <span className="text-sm text-slate-300 group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
                      {link.label}
                      <ExternalIcon
                        className="h-3 w-3 text-slate-600 group-hover:text-brand-400 transition-colors"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {link.description}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; 2026{" "}
            <a
              href="https://www.intelliforge.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-300 transition-colors"
            >
              IntelliForge AI
            </a>
            . All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Built by{" "}
            <a
              href="https://girishbhiremath.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-300 transition-colors font-medium"
            >
              Girish Hiremath
            </a>{" "}
            · Hyderabad · v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
