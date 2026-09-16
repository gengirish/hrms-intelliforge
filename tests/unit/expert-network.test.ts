import { describe, expect, it } from "vitest";
import {
  expertApplySchema,
  isExpertNetworkForm,
  referralPayoutPaise,
} from "@/lib/hiring/expert-network";

describe("referralPayoutPaise", () => {
  const referral = { referrerEmail: "ref@example.com" };

  it("pays ₹300 for H-index 0 and 1", () => {
    expect(referralPayoutPaise({ ...referral, hIndex: 0 })).toBe(30_000);
    expect(referralPayoutPaise({ ...referral, hIndex: 1 })).toBe(30_000);
  });

  it("pays ₹500 for H-index above 1", () => {
    expect(referralPayoutPaise({ ...referral, hIndex: 2 })).toBe(50_000);
    expect(referralPayoutPaise({ ...referral, hIndex: 40 })).toBe(50_000);
  });

  it("returns null when H-index is unknown", () => {
    expect(referralPayoutPaise({ ...referral, hIndex: null })).toBeNull();
  });

  it("returns null for direct applications", () => {
    expect(referralPayoutPaise({ referrerEmail: null, hIndex: 10 })).toBeNull();
  });
});

describe("isExpertNetworkForm", () => {
  it("only matches EXPERT_NETWORK", () => {
    expect(isExpertNetworkForm("EXPERT_NETWORK")).toBe(true);
    expect(isExpertNetworkForm("STANDARD")).toBe(false);
    expect(isExpertNetworkForm(undefined)).toBe(false);
  });
});

describe("expertApplySchema", () => {
  const base = {
    resumeUrl: "https://blob.example.com/resume.pdf",
    expertDomain: "Physics",
    highestDegree: "PhD",
  };

  it("accepts a direct application with required fields only", () => {
    expect(expertApplySchema.safeParse(base).success).toBe(true);
  });

  it("requires a resume", () => {
    expect(expertApplySchema.safeParse({ ...base, resumeUrl: "" }).success).toBe(false);
  });

  it("rejects unknown domains and degrees", () => {
    expect(expertApplySchema.safeParse({ ...base, expertDomain: "Astrology" }).success).toBe(false);
    expect(expertApplySchema.safeParse({ ...base, highestDegree: "Diploma" }).success).toBe(false);
  });

  it("coerces and bounds the H-index", () => {
    const parsed = expertApplySchema.safeParse({ ...base, hIndex: "3" });
    expect(parsed.success && parsed.data.hIndex).toBe(3);
    expect(expertApplySchema.safeParse({ ...base, hIndex: -1 }).success).toBe(false);
    expect(expertApplySchema.safeParse({ ...base, hIndex: 1.5 }).success).toBe(false);
  });

  it("accepts a referral with referrer details and consent", () => {
    const result = expertApplySchema.safeParse({
      ...base,
      referrerName: "Asha",
      referrerEmail: "asha@example.com",
      referralConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a referral without consent", () => {
    const result = expertApplySchema.safeParse({
      ...base,
      referrerName: "Asha",
      referrerEmail: "asha@example.com",
      referralConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a referral missing the referrer email", () => {
    const result = expertApplySchema.safeParse({
      ...base,
      referrerName: "Asha",
      referralConsent: true,
    });
    expect(result.success).toBe(false);
  });
});
