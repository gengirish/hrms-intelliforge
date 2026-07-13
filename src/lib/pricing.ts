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
    tagline: "Launch your first mentor-led cohort",
    features: [
      "2 mentors",
      "Internship listings & careers page",
      "Self-serve intern onboarding",
      "Attendance & weekly task logs",
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
    tagline: "Grow your mentor marketplace",
    features: [
      "10 mentors",
      "Everything in Free",
      "Mentor discovery & ratings",
      "WhatsApp nudges & reminders",
      "Stipend payouts (5% platform fee)",
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
      "50 mentors",
      "Everything in Starter",
      "Weekly mentor reviews & analytics",
      "Priority payout processing",
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
    tagline: "Custom marketplace & payout terms",
    features: [
      "Unlimited mentors",
      "Everything in Growth",
      "Custom platform fee & SLAs",
      "Dedicated onboarding",
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
