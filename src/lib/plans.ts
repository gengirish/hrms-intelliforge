import { z } from "zod";

/**
 * Single source of truth for plans: limits, prices, feature bullets and CTA copy.
 *
 * Every consumer — home pricing section, /pricing cards and FAQ, site metadata,
 * create-org, dashboard settings, the Stripe webhook and server-side limit
 * enforcement — reads from here. Kept free of the Stripe SDK so client pages can
 * import it.
 *
 * Money is stored as integer minor units (US cents, INR paise).
 * `null` limits mean unlimited; `null` price means "custom / talk to us".
 */

export const PLAN_KEYS = ["free", "starter", "growth", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

const minorUnits = z.number().int().nonnegative();
const seatLimit = z.number().int().positive().nullable();

const PlanFeatureSchema = z.object({
  label: z.string().min(1),
  /** Shown as a hero bullet next to the "Start free" CTA (Free plan only). */
  hero: z.boolean().optional(),
});

export const PlanSchema = z.object({
  id: z.enum(PLAN_KEYS),
  name: z.string().min(1),
  tagline: z.string().min(1),
  priceMonthly: z.object({ USD: minorUnits }).nullable(),
  interns: seatLimit,
  mentors: seatLimit,
  features: z.array(PlanFeatureSchema).min(1),
  cta: z.string().min(1),
  highlighted: z.boolean(),
});

export const PlansSchema = z
  .object({
    free: PlanSchema,
    starter: PlanSchema,
    growth: PlanSchema,
    enterprise: PlanSchema,
  })
  .superRefine((plans, ctx) => {
    for (const key of PLAN_KEYS) {
      if (plans[key].id !== key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "id"],
          message: `Plan "${key}" has mismatched id "${plans[key].id}"`,
        });
      }
    }
    if (plans.free.priceMonthly?.USD !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["free", "priceMonthly"],
        message: "Free plan must cost 0",
      });
    }
    if (plans.free.interns === null || plans.free.mentors === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["free"],
        message: "Free plan must have finite limits",
      });
    }
  });

export type Plan = z.infer<typeof PlanSchema>;

/** Bullets that sit next to a "Start free" CTA. Only Free-plan features qualify. */
export function freeHeroHighlights(plans: Record<PlanKey, Plan> = PLANS): string[] {
  return plans.free.features.filter((f) => f.hero).map((f) => f.label);
}

const PLAN_CONFIG = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Launch your first mentor-led cohort",
    priceMonthly: { USD: 0 },
    interns: 500,
    mentors: 20,
    features: [
      { label: "No credit card required", hero: true },
      { label: "Internship listings & careers page" },
      { label: "Self-serve intern onboarding", hero: true },
      { label: "Attendance & weekly task logs", hero: true },
      { label: "Email notifications" },
    ],
    cta: "Start free",
    highlighted: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Grow your internship program",
    priceMonthly: { USD: 2900 },
    // DECISION: Q1 — differ from Free by limits, or by features only? Kept equal to Free until decided.
    interns: 500,
    mentors: 20,
    features: [
      { label: "Everything in Free" },
      { label: "Mentor roster & ratings" },
      { label: "WhatsApp nudges & reminders" },
      { label: "Stipend payouts (5% platform fee)" },
    ],
    cta: "Start Starter",
    highlighted: true,
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Scale cohorts without ops overhead",
    priceMonthly: { USD: 7900 },
    // DECISION: Q1 — differ from Starter by limits, or by features only? Kept equal to Free until decided.
    interns: 500,
    mentors: 20,
    features: [
      { label: "Everything in Starter" },
      { label: "Weekly mentor reviews & analytics" },
      { label: "Priority payout processing" },
      { label: "Priority email support" },
    ],
    cta: "Start Growth",
    highlighted: false,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom program & payout terms",
    priceMonthly: null,
    interns: null,
    mentors: null,
    features: [
      { label: "Everything in Growth" },
      { label: "Custom platform fee & SLAs" },
      { label: "Dedicated onboarding" },
      { label: "Volume pricing" },
    ],
    cta: "Talk to us",
    highlighted: false,
  },
} satisfies Record<PlanKey, Plan>;

export const PLANS: Record<PlanKey, Plan> = PlansSchema.parse(PLAN_CONFIG);

/** Organization.maxInterns / maxMentors are NOT NULL ints; unlimited is stored as this. */
export const UNLIMITED_DB_LIMIT = 999_999;

/** Plans a visitor can pick on /create-org. Enterprise is sales-led. */
export const SELF_SERVE_PLAN_KEYS = ["free", "starter", "growth"] as const;
export type SelfServePlanKey = (typeof SELF_SERVE_PLAN_KEYS)[number];

/** `?plan=` on /create-org and the create-org body: anything invalid becomes Free. */
export const SelfServePlanParam = z.enum(SELF_SERVE_PLAN_KEYS).catch("free");

export function parseSelfServePlan(value: unknown): SelfServePlanKey {
  return SelfServePlanParam.parse(value);
}

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

/** Limits as stored on the Organization row. */
export function planDbLimits(key: PlanKey): { maxInterns: number; maxMentors: number } {
  const plan = PLANS[key];
  return {
    maxInterns: plan.interns ?? UNLIMITED_DB_LIMIT,
    maxMentors: plan.mentors ?? UNLIMITED_DB_LIMIT,
  };
}

/** Limits for a stored plan string; unknown plans fall back to Free. */
export function limitsForPlan(plan: string): { maxInterns: number; maxMentors: number } {
  return planDbLimits(isPlanKey(plan) ? plan : "free");
}

export function formatSeatLimit(limit: number | null): string {
  return limit === null || limit >= UNLIMITED_DB_LIMIT ? "Unlimited" : String(limit);
}

/**
 * True when the self-serve plans (Free, Starter, Growth) differ in intern or
 * mentor capacity. Marketing copy reads this so it never promises "more seats"
 * when every self-serve plan has the same capacity (Q1).
 */
export function selfServePlansDifferByCapacity(): boolean {
  const selfServe = [PLANS.free, PLANS.starter, PLANS.growth];
  return selfServe.some(
    (p) => p.interns !== PLANS.free.interns || p.mentors !== PLANS.free.mentors,
  );
}
