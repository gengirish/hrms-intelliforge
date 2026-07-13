import { describe, it, expect } from "vitest";
import {
  calculatePlatformFee,
  getPlanLimits,
} from "@/lib/plan-limits";

describe("getPlanLimits", () => {
  it("returns mentor limits per plan", () => {
    expect(getPlanLimits("free").maxMentors).toBe(2);
    expect(getPlanLimits("starter").maxMentors).toBe(10);
    expect(getPlanLimits("growth").maxMentors).toBe(50);
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
