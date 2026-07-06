import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });
});
