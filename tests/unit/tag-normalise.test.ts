import { describe, it, expect } from "vitest";
import {
  buildTagFilterIndex,
  normaliseTags,
  storedTagsForFilter,
  tagFilterOptions,
} from "@/lib/tag-normalise";
import { canonicalTag, TAG_ALIASES } from "@/lib/tag-aliases";

describe("normaliseTags (D6)", () => {
  it("splits on ; and , and trims", () => {
    expect(normaliseTags(["Operations Management; Student Mentoring", " Go ,  Rust "])).toEqual([
      "Operations Management",
      "Student Mentoring",
      "Go",
      "Rust",
    ]);
  });

  it("de-duplicates case-insensitively, keeping the first spelling", () => {
    expect(normaliseTags(["Agile", "agile", "AGILE ", "Scrum"])).toEqual(["Agile", "Scrum"]);
  });

  it("drops empties and caps at 20 tags", () => {
    expect(normaliseTags([";;", " , ", ""])).toEqual([]);
    expect(normaliseTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(20);
    expect(normaliseTags(null)).toEqual([]);
  });
});

describe("tag aliases (D6)", () => {
  it("maps the QA-reported variants to one label", () => {
    expect(canonicalTag("SDLC")).toBe(canonicalTag("Software Development Lifecycle"));
    expect(canonicalTag("Agile Project Management")).toBe(canonicalTag("Agile"));
    expect(canonicalTag("Digital Business Transformation")).toBe(canonicalTag("Digital Transformation"));
    expect(canonicalTag("  Rust ")).toBe("Rust");
  });

  it("has canonical labels that are not themselves aliased to something else", () => {
    for (const label of Object.values(TAG_ALIASES)) expect(canonicalTag(label)).toBe(label);
  });
});

describe("filter index (D6)", () => {
  const stored = [
    "Operations Management; Student Mentoring",
    "SDLC",
    "Software Development Lifecycle",
    "Agile Project Management",
    "Agile",
    "agile",
  ];
  const index = buildTagFilterIndex(stored);
  const options = tagFilterOptions(index);

  it("has no delimiter-joined or alias-pair options", () => {
    expect(options.some((o) => /[;,]/.test(o))).toBe(false);
    expect(options).toEqual(["Agile", "Operations Management", "Software Development Lifecycle", "Student Mentoring"]);
  });

  it("matches every stored variant for a chosen label", () => {
    expect(storedTagsForFilter(index, "Agile").sort()).toEqual(["Agile", "Agile Project Management", "agile"].sort());
    expect(storedTagsForFilter(index, "Student Mentoring")).toEqual(["Operations Management; Student Mentoring"]);
    expect(storedTagsForFilter(index, "sdlc").sort()).toEqual(["SDLC", "Software Development Lifecycle"].sort());
  });

  it("falls back to the raw label when nothing matches", () => {
    expect(storedTagsForFilter(index, "Haskell")).toEqual(["Haskell"]);
  });
});
