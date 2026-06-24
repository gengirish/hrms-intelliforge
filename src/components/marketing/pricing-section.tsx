import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETING_PLANS } from "@/lib/pricing";

interface PricingSectionProps {
  id?: string;
  showHeading?: boolean;
  compact?: boolean;
}

export function PricingSection({
  id = "pricing",
  showHeading = true,
  compact = false,
}: PricingSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={showHeading ? "pricing-heading" : undefined}
      className={cn(
        "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
        compact ? "py-12 sm:py-16" : "py-16 sm:py-24",
      )}
    >
      {showHeading && (
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-400 mb-3">
            Simple pricing
          </p>
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl font-bold text-white text-balance"
          >
            Start free. Scale when your cohort grows.
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            No sales call required. Create your workspace in under two minutes —
            upgrade only when you need more seats.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {MARKETING_PLANS.map((plan) => (
          <article
            key={plan.key}
            className={cn(
              "trust-card flex flex-col p-6 relative",
              plan.highlighted &&
                "ring-2 ring-brand-500/60 shadow-brand-glow border-brand-500/30",
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}

            <header>
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-slate-500">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Up to <strong className="text-slate-200">{plan.interns}</strong>{" "}
                interns
              </p>
            </header>

            <ul className="mt-6 space-y-2.5 flex-1">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <Check
                    className="h-4 w-4 text-brand-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-2">
              {plan.key === "enterprise" ? (
                <a
                  href="mailto:hr@intelliforge.tech?subject=IntelliForge%20HRMS%20Enterprise"
                  className="btn-secondary w-full border-slate-600 text-slate-200 hover:border-brand-500/50"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  href="/create-org"
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    plan.highlighted ? "btn-cta" : "btn-primary",
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        All plans include multi-tenant isolation, audit logs, and IST timezone
        defaults. Cancel anytime from workspace settings.
      </p>
    </section>
  );
}
