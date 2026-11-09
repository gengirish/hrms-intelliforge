import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

const BS = String.fromCharCode(92); // a literal backslash

describe("safeRedirectPath", () => {
  it("keeps same-origin relative paths with query and hash", () => {
    expect(safeRedirectPath("/attendance")).toBe("/attendance");
    expect(safeRedirectPath("/dashboard/settings?billing=pending#plan")).toBe(
      "/dashboard/settings?billing=pending#plan",
    );
  });

  it.each([
    "https://example.com",
    "http://example.com/attendance",
    "//example.com",
    "//example.com/path",
    `/${BS}example.com`,
    "\\example.com",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,hi",
    "/\t/example.com",
    "/\n/example.com",
    "attendance",
    "",
    "   ",
  ])("rejects %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it("uses the fallback for missing values", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined, "/dashboard")).toBe("/dashboard");
  });
});
