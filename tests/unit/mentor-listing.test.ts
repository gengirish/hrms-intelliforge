import { describe, it, expect } from "vitest";
import {
  dedupeBioAgainstHeadline,
  formatHourlyRate,
  isMentorProfileComplete,
  missingMentorProfileFields,
  normaliseMentorName,
  normaliseMentorProfileFields,
} from "@/lib/mentor-listing";

describe("mentor completeness (D5)", () => {
  const complete = { headline: "Platform lead", bio: "Mentors on system design.", expertise: ["Go"] };

  it("needs headline, bio and one tag", () => {
    expect(isMentorProfileComplete(complete)).toBe(true);
    expect(missingMentorProfileFields({ headline: null, bio: null, expertise: [] })).toEqual([
      "headline",
      "bio",
      "at least one expertise tag",
    ]);
    expect(isMentorProfileComplete({ ...complete, headline: "   " })).toBe(false);
    expect(isMentorProfileComplete({ ...complete, expertise: [" "] })).toBe(false);
  });
});

describe("dedupeBioAgainstHeadline (D5)", () => {
  it("drops a bio that repeats the headline, ignoring case and punctuation", () => {
    expect(dedupeBioAgainstHeadline("Operations leader", "operations leader.")).toBeNull();
    expect(dedupeBioAgainstHeadline("Operations leader", "  Operations   Leader ")).toBeNull();
  });

  it("keeps a real bio and trims it", () => {
    expect(dedupeBioAgainstHeadline("Operations leader", "  Ten years in ops. ")).toBe("Ten years in ops.");
    expect(dedupeBioAgainstHeadline(null, "Bio")).toBe("Bio");
    expect(dedupeBioAgainstHeadline("x", "")).toBeNull();
  });

  it("is applied by normaliseMentorProfileFields on save", () => {
    expect(normaliseMentorProfileFields({ headline: " Lead ", bio: "Lead" })).toEqual({ headline: "Lead", bio: null });
    expect(normaliseMentorProfileFields({ headline: "Lead" })).toEqual({ headline: "Lead" });
  });
});

describe("formatHourlyRate (D5)", () => {
  it("formats paise as rupees with currency", () => {
    expect(formatHourlyRate(500000)).toBe("₹5,000/hr");
    expect(formatHourlyRate(12345600)).toBe("₹1,23,456/hr");
    expect(formatHourlyRate(50050)).toBe("₹500.50/hr");
  });

  it("returns null when unset", () => {
    expect(formatHourlyRate(null)).toBeNull();
    expect(formatHourlyRate(0)).toBeNull();
  });
});

describe("normaliseMentorName", () => {
  it("matches names that differ only in case, spacing or accents", () => {
    expect(normaliseMentorName("Ravi  Bandakkanavar")).toBe(normaliseMentorName("ravi bandakkanavar"));
    expect(normaliseMentorName("José K.")).toBe("jose k");
  });
});
