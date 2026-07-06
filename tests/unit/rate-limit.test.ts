import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const ip = "test-allow-ip";
    const limit = 3;

    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
  });

  it("blocks requests after the limit is exceeded", () => {
    const ip = "test-block-ip";
    const limit = 2;

    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(false);
    expect(rateLimit(ip, limit, 60_000)).toBe(false);
  });

  it("resets after the window expires", () => {
    const ip = "test-reset-ip";
    const limit = 1;
    const windowMs = 10;

    expect(rateLimit(ip, limit, windowMs)).toBe(true);
    expect(rateLimit(ip, limit, windowMs)).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(ip, limit, windowMs)).toBe(true);
        resolve();
      }, windowMs + 5);
    });
  });
});
