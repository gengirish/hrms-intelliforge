import {
  PLANS,
  PLAN_KEYS,
  formatSeatLimit,
  selfServePlansDifferByCapacity,
  type Plan,
  type PlanKey,
} from "@/lib/plans";

/** Display view-model for pricing cards. Everything is derived from PLANS. */
export interface MarketingPlan {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  interns: string;
  mentors: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

function formatUsdMinor(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

export function formatPlanPrice(plan: Plan): { price: string; period: string } {
  if (!plan.priceMonthly) return { price: "Custom", period: "" };
  return { price: formatUsdMinor(plan.priceMonthly.USD), period: "/mo" };
}

export const FREE_PLAN_MAX_INTERNS = PLANS.free.interns as number;
export const FREE_PLAN_MAX_MENTORS = PLANS.free.mentors as number;

export const MARKETING_PLANS: MarketingPlan[] = PLAN_KEYS.map((key) => {
  const plan = PLANS[key];
  return {
    key,
    name: plan.name,
    ...formatPlanPrice(plan),
    interns: formatSeatLimit(plan.interns),
    mentors: formatSeatLimit(plan.mentors),
    tagline: plan.tagline,
    features: plan.features.map((f) => f.label),
    cta: plan.cta,
    highlighted: plan.highlighted,
  };
});

export const DASHBOARD_PLANS = MARKETING_PLANS.map((plan) => ({
  key: plan.key,
  name: plan.name,
  price: plan.period ? `${plan.price}${plan.period}` : plan.price,
  interns: plan.interns,
  mentors: plan.mentors,
  current: false,
}));

/** The Free plan allowance in prose, e.g. "N interns and M mentors". */
export function freePlanAllowance(): string {
  return `${FREE_PLAN_MAX_INTERNS} interns and ${FREE_PLAN_MAX_MENTORS} mentors`;
}

/**
 * Pricing copy that depends on whether the self-serve plans differ by capacity
 * (Q1). If they don't, never claim "pay per capacity" or "more seats".
 */
export function pricingCopy() {
  if (selfServePlansDifferByCapacity()) {
    return {
      sectionHeading: "Start free. Scale mentors and interns together.",
      sectionSubheading:
        "No sales call required. List internships, invite mentors, and upgrade only when you need more seats.",
      pageSubheading:
        "One platform for mentor roster, cohort accountability, and stipend payouts. Pay for intern and mentor capacity as your program grows.",
    };
  }
  return {
    sectionHeading: "Start free. Upgrade for payouts and automation.",
    sectionSubheading: `No sales call required. Every self-serve plan includes ${freePlanAllowance()} — upgrade when you need WhatsApp nudges, stipend payouts and analytics.`,
    pageSubheading: `One platform for mentor roster, cohort accountability, and stipend payouts. Every self-serve plan includes ${freePlanAllowance()}; paid plans add automation, payouts and analytics.`,
  };
}

export function mentorSeatsFaqAnswer(): string {
  const selfServe = (["free", "starter", "growth"] as const).map(
    (k) => `${formatSeatLimit(PLANS[k].mentors)} on ${PLANS[k].name}`,
  );
  const enterprise = formatSeatLimit(PLANS.enterprise.mentors).toLowerCase();
  return `Yes. Mentor seats: ${selfServe.join(", ")} — ${enterprise} on Enterprise. Mentors get their own dashboard for reviews and cohort management.`;
}
