import { PLANS, type PlanKey } from "@/lib/stripe";

export interface MarketingPlan {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  interns: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    interns: "5",
    tagline: "Prove the workflow on a small cohort",
    features: [
      "Self-serve intern onboarding",
      "Attendance & weekly task logs",
      "Offer letters with PDF export",
      "Email notifications",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    interns: "25",
    tagline: "For growing internship programs",
    features: [
      "Everything in Free",
      "WhatsApp nudges & reminders",
      "Hiring pipeline & careers page",
      "Team invites (admin + mentor)",
    ],
    cta: "Start Starter",
    highlighted: true,
  },
  {
    key: "growth",
    name: "Growth",
    price: "$79",
    period: "/mo",
    interns: "100",
    tagline: "Scale cohorts without ops overhead",
    features: [
      "Everything in Starter",
      "Weekly progress reviews",
      "Analytics & score dashboards",
      "Priority email support",
    ],
    cta: "Start Growth",
    highlighted: false,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    interns: "Unlimited",
    tagline: "SSO, custom domains, SLAs",
    features: [
      "Everything in Growth",
      "Dedicated onboarding",
      "Custom integrations",
      "Volume pricing",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
];

export const DASHBOARD_PLANS = MARKETING_PLANS.map((plan) => ({
  key: plan.key,
  name: plan.name,
  price: plan.period ? `${plan.price}${plan.period}` : plan.price,
  interns: PLANS[plan.key].maxInterns >= 999999 ? "Unlimited" : PLANS[plan.key].maxInterns,
  current: false,
}));
