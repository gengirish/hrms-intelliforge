import Stripe from "stripe";
import { PLANS, limitsForPlan, type PlanKey } from "@/lib/plans";

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
  return limitsForPlan(plan);
}

/** Stripe Price id for a paid plan, read from STRIPE_<PLAN>_PRICE_ID at call time. */
export function getStripePriceId(plan: PlanKey): string {
  if (plan === "free") return "";
  return process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`] ?? "";
}
