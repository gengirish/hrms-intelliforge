import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

const TEST_JWT_SECRET = "test-jwt-secret-at-least-32-chars-long";

describe("auth password helpers", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  it(
    "hashPassword + verifyPassword roundtrip succeeds",
    async () => {
      const { hashPassword, verifyPassword } = await import("@/lib/auth");
      const password = "my-secure-password";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("wrong-password", hash)).toBe(false);
    },
    60_000
  );
});

describe("auth JWT helpers", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  it(
    "signJWT + verifyJWT roundtrip preserves payload",
    async () => {
      const { signJWT, verifyJWT } = await import("@/lib/auth");
      const token = await signJWT({
        userId: "user-123",
        role: "admin",
        email: "admin@example.com",
        orgId: "org-456",
        adminOrgRole: "ADMIN",
      });

      const payload = await verifyJWT(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe("user-123");
      expect(payload?.role).toBe("admin");
      expect(payload?.email).toBe("admin@example.com");
      expect(payload?.orgId).toBe("org-456");
      expect(payload?.adminOrgRole).toBe("ADMIN");
    },
    30_000
  );

  it("verifyJWT returns null for invalid token", async () => {
    const { verifyJWT } = await import("@/lib/auth");
    const payload = await verifyJWT("not.a.valid.jwt");
    expect(payload).toBeNull();
  });
});
