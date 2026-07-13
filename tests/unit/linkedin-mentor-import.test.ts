import { describe, expect, it } from "vitest";
import { normalizeLinkedInProfileUrl } from "@/lib/ai/linkedin-mentor-import";

describe("normalizeLinkedInProfileUrl", () => {
  it("normalizes standard profile URLs", () => {
    expect(
      normalizeLinkedInProfileUrl("https://www.linkedin.com/in/jane-doe/")
    ).toBe("https://www.linkedin.com/in/jane-doe/");
  });

  it("adds https and www when missing", () => {
    expect(normalizeLinkedInProfileUrl("linkedin.com/in/john_smith")).toBe(
      "https://www.linkedin.com/in/john_smith/"
    );
  });

  it("strips query strings from path validation", () => {
    const url = normalizeLinkedInProfileUrl(
      "https://linkedin.com/in/jane-doe?trk=profile"
    );
    expect(url).toBe("https://www.linkedin.com/in/jane-doe/");
  });

  it("rejects non-profile URLs", () => {
    expect(normalizeLinkedInProfileUrl("https://linkedin.com/company/acme")).toBeNull();
    expect(normalizeLinkedInProfileUrl("https://example.com/in/foo")).toBeNull();
    expect(normalizeLinkedInProfileUrl("")).toBeNull();
  });
});
