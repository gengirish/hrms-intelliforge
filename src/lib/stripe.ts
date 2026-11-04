import Stripe from "stripe";
import { PLANS, type PlanKey } from "@/lib/plans";

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

export { PLANS, type PlanKey };

export function getPlanLimits(plan: string): { maxInterns: number; maxMentors: number } {
  const p = PLANS[plan as PlanKey];
  return { maxInterns: p?.maxInterns ?? 500, maxMentors: p?.maxMentors ?? 20 };
}
