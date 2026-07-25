import { describe, expect, it } from "vitest";
import {
  mentorApplicationSchema,
  mentorApplicationReviewSchema,
} from "@/lib/validations";

describe("mentorApplicationSchema", () => {
  const validBase = {
    name: "Jane Doe",
    email: "jane@example.com",
  };

  it("accepts the minimal required fields (name + email)", () => {
    const result = mentorApplicationSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated application", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      phone: "+91 98765 43210",
      headline: "Senior ML Engineer",
      bio: "I mentor on ML and system design.",
      expertise: ["Machine Learning", "System Design"],
      yearsExperience: 8,
      linkedinUrl: "https://linkedin.com/in/jane",
      githubUrl: "https://github.com/jane",
      portfolioUrl: "https://jane.dev",
      orgSlug: "intelliforge",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = mentorApplicationSchema.safeParse({ email: "jane@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = mentorApplicationSchema.safeParse({ ...validBase, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true);
    }
  });

  it("tolerates empty-string optional URL fields", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      linkedinUrl: "",
      githubUrl: "",
      portfolioUrl: "",
      phone: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed LinkedIn URL", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      linkedinUrl: "linkedin.com/in/jane",
    });
    expect(result.success).toBe(false);
  });

  it("rejects yearsExperience out of range", () => {
    const tooHigh = mentorApplicationSchema.safeParse({
      ...validBase,
      yearsExperience: 61,
    });
    const negative = mentorApplicationSchema.safeParse({
      ...validBase,
      yearsExperience: -1,
    });
    expect(tooHigh.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it("rejects more than 20 expertise entries", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      expertise: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid orgSlug format", () => {
    const result = mentorApplicationSchema.safeParse({
      ...validBase,
      orgSlug: "Invalid_Slug!",
    });
    expect(result.success).toBe(false);
  });
});

describe("mentorApplicationReviewSchema", () => {
  it("accepts approve", () => {
    expect(mentorApplicationReviewSchema.safeParse({ action: "approve" }).success).toBe(
      true
    );
  });

  it("accepts reject with a review note", () => {
    const result = mentorApplicationReviewSchema.safeParse({
      action: "reject",
      reviewNote: "Not enough relevant experience.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(
      mentorApplicationReviewSchema.safeParse({ action: "maybe" }).success
    ).toBe(false);
  });

  it("rejects a review note over 2000 characters", () => {
    const result = mentorApplicationReviewSchema.safeParse({
      action: "reject",
      reviewNote: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
