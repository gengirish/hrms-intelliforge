import Link from "next/link";
import { Quote, Sparkles, ShieldCheck, MapPin, ArrowRight } from "lucide-react";

const partnerBadges = [
  { icon: Sparkles, label: "IntelliForge AI" },
  { icon: ShieldCheck, label: "Bharat AI Mission aligned" },
  { icon: MapPin, label: "Hyderabad, IN" },
  { icon: null, label: "Intern Program 2026" },
] as const;

const testimonials = [
  {
    quote:
      "We run our own 500+ intern cohort on this. Onboarding dropped from 3 days of back-and-forth emails to under 60 seconds per intern — and we finally have audit-ready attendance without chasing spreadsheets.",
    name: "IntelliForge AI Intern Ops",
    role: "Internal program · 500+ cohort",
    initials: "IF",
    tag: "Dogfooding",
  },
  {
    quote:
      "We built HRMS because we were drowning in offer letters and WhatsApp follow-ups every cohort. One link now handles documents, e-signatures, and task logs — built for programs like ours.",
    name: "Girish Hiremath",
    role: "Founder, IntelliForge AI",
    initials: "GH",
    tag: null,
  },
] as const;

export function SocialProof() {
  return (
    <section
      aria-labelledby="social-proof-heading"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-slate-800/60"
    >
      <div className="text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-300 mb-3">
          Social proof
        </p>
        <h2
          id="social-proof-heading"
          className="text-2xl sm:text-3xl font-bold text-white"
        >
          Built in production for our own cohort
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Dogfooded on IntelliForge&apos;s 500+ intern program — built for teams
          running real internal internship cohorts.
        </p>
      </div>

      <ul
        aria-label="Partner and program badges"
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12"
      >
        {partnerBadges.map((badge) => (
          <li key={badge.label}>
            <span className="badge-trust">
              {badge.icon ? (
                <badge.icon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              <span>{badge.label}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item) => (
          <figure
            key={item.name}
            className="trust-card p-6 flex flex-col h-full"
          >
            <Quote
              className="h-5 w-5 text-brand-400/70 mb-4 shrink-0"
              aria-hidden="true"
            />
            <blockquote className="flex-1 text-sm text-slate-300 leading-relaxed">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-800">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-300 ring-1 ring-inset ring-brand-500/30"
              >
                {item.initials}
              </span>
              <div className="min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <cite className="not-italic text-sm font-semibold text-white">
                    {item.name}
                  </cite>
                  {item.tag ? (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400 truncate">{item.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
        <div className="trust-card p-6 flex flex-col h-full border-dashed border-brand-500/30">
          <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-300 w-fit mb-4">
            Beta · Design partners
          </span>
          <p className="flex-1 text-sm text-slate-300 leading-relaxed">
            We&apos;re onboarding a handful of programs running real intern
            cohorts — not fabricated case studies. Get early access, direct
            founder support, and help shape the roadmap.
          </p>
          <Link
            href="/create-org"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 hover:text-brand-200 transition-colors pt-5 border-t border-slate-800"
          >
            Apply as a design partner
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
