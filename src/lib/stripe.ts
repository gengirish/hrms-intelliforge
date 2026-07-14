import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  free: { name: "Free", maxInterns: 500, maxMentors: 20, priceId: null },
  starter: { name: "Starter", maxInterns: 500, maxMentors: 20, priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "" },
  growth: { name: "Growth", maxInterns: 500, maxMentors: 20, priceId: process.env.STRIPE_GROWTH_PRICE_ID ?? "" },
  enterprise: { name: "Enterprise", maxInterns: 999999, maxMentors: 999999, priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "" },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: string): { maxInterns: number; maxMentors: number } {
  const p = PLANS[plan as PlanKey];
  return { maxInterns: p?.maxInterns ?? 500, maxMentors: p?.maxMentors ?? 20 };
}
