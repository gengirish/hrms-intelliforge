import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations";

describe("registerSchema", () => {
  const validBase = {
    email: "user@example.com",
    password: "password123",
    name: "Test User",
  };

  it("accepts valid input without orgSlug", () => {
    const result = registerSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with orgSlug", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      orgSlug: "my-org",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(
        true
      );
    }
  });

  it("rejects password longer than 128 characters", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid orgSlug format", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      orgSlug: "Invalid_Slug!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects orgSlug shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      ...validBase,
      orgSlug: "a",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "any",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
