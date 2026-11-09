import { describe, it, expect } from "vitest";
import {
  PLANS,
  PLAN_KEYS,
  PlansSchema,
  UNLIMITED_DB_LIMIT,
  formatSeatLimit,
  freeHeroHighlights,
  isPlanKey,
  limitsForPlan,
  makePlansSchema,
  parseSelfServePlan,
  planDbLimits,
} from "@/lib/plans";
import {
  MARKETING_PLANS,
  formatMinorUnits,
  formatPlanPrice,
  freePlanAllowance,
  mentorSeatsFaqAnswer,
} from "@/lib/pricing";

describe("PLANS schema", () => {
  it("parses the shipped config", () => {
    expect(() => PlansSchema.parse(PLANS)).not.toThrow();
  });

  it("rejects a plan whose id does not match its key", () => {
    const bad = { ...PLANS, starter: { ...PLANS.starter, id: "growth" } };
    expect(PlansSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a non-zero Free price", () => {
    const bad = { ...PLANS, free: { ...PLANS.free, priceMonthly: { USD: 100 } } };
    expect(PlansSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects fractional minor-unit prices", () => {
    const bad = { ...PLANS, growth: { ...PLANS.growth, priceMonthly: { USD: 79.5 } } };
    expect(PlansSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unlimited Free limits", () => {
    const bad = { ...PLANS, free: { ...PLANS.free, interns: null } };
    expect(PlansSchema.safeParse(bad).success).toBe(false);
  });
});

describe("plan helpers", () => {
  it("only accepts real plan keys", () => {
    for (const key of PLAN_KEYS) expect(isPlanKey(key)).toBe(true);
    for (const bad of ["", "pro", "__proto__", "constructor", null, 1, undefined]) {
      expect(isPlanKey(bad)).toBe(false);
    }
  });

  it("stores unlimited as the DB sentinel", () => {
    expect(planDbLimits("enterprise")).toEqual({
      maxInterns: UNLIMITED_DB_LIMIT,
      maxMentors: UNLIMITED_DB_LIMIT,
    });
    expect(formatSeatLimit(null)).toBe("Unlimited");
    expect(formatSeatLimit(UNLIMITED_DB_LIMIT)).toBe("Unlimited");
  });

  it("falls back to Free for unknown stored plans", () => {
    expect(limitsForPlan("legacy")).toEqual(planDbLimits("free"));
  });
});

describe("marketing view-model reads PLANS", () => {
  it("shows each plan's limits", () => {
    for (const card of MARKETING_PLANS) {
      expect(card.interns).toBe(formatSeatLimit(PLANS[card.key].interns));
      expect(card.mentors).toBe(formatSeatLimit(PLANS[card.key].mentors));
    }
  });

  it("builds copy from Free limits", () => {
    expect(freePlanAllowance()).toBe(`${PLANS.free.interns} interns and ${PLANS.free.mentors} mentors`);
    expect(mentorSeatsFaqAnswer()).toContain(`${PLANS.growth.mentors} on Growth`);
  });

  it("does not hardcode a mentor count in feature bullets", () => {
    for (const card of MARKETING_PLANS) {
      for (const f of card.features) expect(f).not.toMatch(/\d+\s+mentors/i);
    }
  });
});

describe("parseSelfServePlan (/create-org ?plan=)", () => {
  it("accepts self-serve plans", () => {
    expect(parseSelfServePlan("starter")).toBe("starter");
    expect(parseSelfServePlan("growth")).toBe("growth");
    expect(parseSelfServePlan("free")).toBe("free");
  });

  it("falls back to free for anything else, including sales-led Enterprise", () => {
    for (const bad of [null, undefined, "", "STARTER", "pro", "enterprise", "__proto__", 42]) {
      expect(parseSelfServePlan(bad)).toBe("free");
    }
  });
});

describe("freeHeroHighlights (D3)", () => {
  it("only returns Free-plan features", () => {
    const free = PLANS.free.features.map((f) => f.label);
    const highlights = freeHeroHighlights();
    expect(highlights.length).toBeGreaterThan(0);
    for (const h of highlights) expect(free).toContain(h);
  });

  it("never mentions paid-only features", () => {
    for (const h of freeHeroHighlights()) expect(h).not.toMatch(/payout|rating|review|whatsapp/i);
  });
});

describe("currency-aware prices (D13)", () => {
  it("formats minor units per currency", () => {
    expect(formatMinorUnits(2900, "USD")).toBe("$29");
    expect(formatMinorUnits(249900, "INR")).toBe("₹2,499");
    expect(formatMinorUnits(1050, "USD")).toBe("$10.50");
  });

  it("shows the configured currency and falls back to USD without an INR amount", () => {
    const withInr = { ...PLANS.starter, priceMonthly: { USD: 2900, INR: 249900 } };
    expect(formatPlanPrice(withInr, "USD").price).toBe("$29");
    expect(formatPlanPrice(withInr, "INR").price).toBe("₹2,499");
    expect(formatPlanPrice(withInr, "both").price).toBe("₹2,499 · $29");
    expect(formatPlanPrice(PLANS.starter, "INR").price).toBe("$29");
    expect(formatPlanPrice(PLANS.enterprise).price).toBe("Custom");
  });

  it("refuses to show INR when a paid plan has no INR price", () => {
    expect(makePlansSchema("USD").safeParse(PLANS).success).toBe(true);
    expect(makePlansSchema("INR").safeParse(PLANS).success).toBe(false);
  });
});
