// Single source of truth for plan limits. Kept free of the Stripe SDK so public
// client pages can read it.
export const PLANS = {
  free: { name: "Free", maxInterns: 500, maxMentors: 20, priceId: null },
  starter: { name: "Starter", maxInterns: 500, maxMentors: 20, priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "" },
  growth: { name: "Growth", maxInterns: 500, maxMentors: 20, priceId: process.env.STRIPE_GROWTH_PRICE_ID ?? "" },
  enterprise: { name: "Enterprise", maxInterns: 999999, maxMentors: 999999, priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "" },
} as const;

export type PlanKey = keyof typeof PLANS;
