import { describe, it, expect } from "vitest";
import {
  calculatePlatformFee,
  getPlanLimits,
} from "@/lib/plan-limits";
import { PLANS } from "@/lib/plans";

describe("getPlanLimits", () => {
  it("returns mentor limits per plan", () => {
    expect(getPlanLimits("free").maxMentors).toBe(PLANS.free.mentors);
    expect(getPlanLimits("starter").maxMentors).toBe(PLANS.starter.mentors);
    expect(getPlanLimits("growth").maxMentors).toBe(PLANS.growth.mentors);
    expect(getPlanLimits("growth").maxInterns).toBe(PLANS.growth.interns);
  });
});

describe("calculatePlatformFee", () => {
  it("deducts 10% platform fee by default bps", () => {
    const result = calculatePlatformFee(10_000, 1000);
    expect(result.platformFeePaise).toBe(1000);
    expect(result.netAmountPaise).toBe(9000);
  });

  it("handles zero gross", () => {
    const result = calculatePlatformFee(0, 1000);
    expect(result.platformFeePaise).toBe(0);
    expect(result.netAmountPaise).toBe(0);
  });
});
