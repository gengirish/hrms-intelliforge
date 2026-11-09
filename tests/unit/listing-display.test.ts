import { describe, it, expect } from "vitest";
import {
  formatStipendLabel,
  listingTypeLabel,
  slugChangeForTitle,
  slugMatchesTitle,
} from "@/lib/hiring/listing-display";

describe("formatStipendLabel (D11)", () => {
  it("shows a stated amount", () => {
    expect(formatStipendLabel("₹10,000 – ₹15,000 / month")).toEqual({
      text: "₹10,000 – ₹15,000 / month",
      disclosed: true,
    });
  });
  it("flags text with no amount", () => {
    expect(formatStipendLabel("Stipend + PPO Potential").text).toBe(
      "Stipend + PPO Potential · amount not disclosed",
    );
  });
  it("says not disclosed when empty, with the right noun", () => {
    expect(formatStipendLabel(null).text).toBe("Stipend not disclosed");
    expect(formatStipendLabel("  ", "CONTRACT").text).toBe("Pay not disclosed");
  });
});

describe("listing slugs (D11)", () => {
  it("detects a slug that no longer matches its title", () => {
    expect(slugMatchesTitle("sales-associate-intern-awaazos", "AI-Native Outreach Associate Intern")).toBe(false);
    expect(slugMatchesTitle("ai-native-outreach-associate-intern", "AI-Native Outreach Associate Intern")).toBe(true);
    expect(slugMatchesTitle("ai-native-outreach-associate-intern-x1y2", "AI-Native Outreach Associate Intern")).toBe(true);
  });

  it("regenerates and keeps the old slug for redirects", async () => {
    const change = await slugChangeForTitle(
      { slug: "sales-associate-intern-awaazos", title: "x", previousSlugs: ["older"] },
      "AI-Native Outreach Associate Intern",
      async () => false,
    );
    expect(change).toEqual({
      slug: "ai-native-outreach-associate-intern",
      previousSlugs: ["older", "sales-associate-intern-awaazos"],
    });
  });

  it("adds a suffix when the new slug is taken", async () => {
    const change = await slugChangeForTitle(
      { slug: "old", title: "x", previousSlugs: [] },
      "Data Intern",
      async (s) => s === "data-intern",
    );
    expect(change?.slug).toMatch(/^data-intern-[a-z0-9]{1,4}$/);
  });

  it("does nothing when the slug already fits", async () => {
    expect(
      await slugChangeForTitle({ slug: "data-intern", title: "Data Intern", previousSlugs: [] }, "Data Intern", async () => true),
    ).toBeNull();
  });

  it("labels types", () => {
    expect(listingTypeLabel("CONTRACT")).toBe("Contract");
    expect(listingTypeLabel("WEIRD")).toBe("WEIRD");
  });
});
