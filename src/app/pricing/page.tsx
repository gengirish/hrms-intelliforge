import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for mentor-led internship programs. Start free with 5 interns and 2 mentors — scale as your marketplace grows.",
};

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan lets you launch a workspace with up to 5 interns without entering payment details.",
  },
  {
    q: "Can interns sign up themselves?",
    a: "Yes. Share your careers page or onboarding link. Interns self-register into your org — you approve offers from the dashboard.",
  },
  {
    q: "What happens when I hit my intern limit?",
    a: "You'll see an upgrade prompt in settings. Existing interns stay active; you can't add new ones until you upgrade or deactivate someone.",
  },
  {
    q: "Are mentor seats included?",
    a: "Yes. Every plan includes mentor seats — 2 on Free, 10 on Starter, 50 on Growth, and unlimited on Enterprise. Mentors get their own dashboard for reviews and cohort management.",
  },
  {
    q: "How do stipend payouts work?",
    a: "Collect stipends upfront when interns enroll. The platform processes payouts to mentors and interns on your schedule, with a transparent platform fee shown at checkout.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 gradient-hero opacity-80" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white text-balance">
              Pricing that scales with your marketplace
            </h1>
            <p className="mt-4 text-slate-300 leading-relaxed">
              One platform for mentor discovery, cohort accountability, and
              stipend payouts. Pay per intern and mentor capacity — not per
              feature gate.
            </p>
            <Link href="/create-org" className="btn-cta mt-8 px-6 py-3 text-base">
              Create free workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <PricingSection showHeading={false} />

        <section
          aria-labelledby="pricing-faq-heading"
          className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20"
        >
          <h2
            id="pricing-faq-heading"
            className="text-xl font-bold text-white flex items-center gap-2 mb-8"
          >
            <HelpCircle className="h-5 w-5 text-brand-400" aria-hidden="true" />
            Frequently asked questions
          </h2>
          <dl className="space-y-6">
            {faqs.map((item) => (
              <div key={item.q} className="trust-card p-5">
                <dt className="text-sm font-semibold text-white">{item.q}</dt>
                <dd className="mt-2 text-sm text-slate-400 leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
