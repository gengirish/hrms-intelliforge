import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import { resolveOrgForPublicSignup } from "@/lib/default-org";

const ORIGINAL_DEFAULT = process.env.DEFAULT_ORG_SLUG;

describe("resolveOrgForPublicSignup", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    delete process.env.DEFAULT_ORG_SLUG;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_DEFAULT === undefined) delete process.env.DEFAULT_ORG_SLUG;
    else process.env.DEFAULT_ORG_SLUG = ORIGINAL_DEFAULT;
  });

  it("uses an explicit orgSlug over the default", async () => {
    process.env.DEFAULT_ORG_SLUG = "intelliforge-ai";
    findUnique.mockResolvedValue({ id: "org-cx" });

    const result = await resolveOrgForPublicSignup("cx");

    expect(result).toEqual({ ok: true, orgId: "org-cx" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "cx" },
      select: { id: true },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("404s on an explicit slug that does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const result = await resolveOrgForPublicSignup("nope");

    expect(result).toEqual({
      ok: false,
      error: "Organization not found",
      status: 404,
    });
  });

  it("falls back to DEFAULT_ORG_SLUG when no slug is supplied", async () => {
    process.env.DEFAULT_ORG_SLUG = "intelliforge-ai";
    findUnique.mockResolvedValue({ id: "org-if" });

    const result = await resolveOrgForPublicSignup();

    expect(result).toEqual({ ok: true, orgId: "org-if" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "intelliforge-ai" },
      select: { id: true },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("uses the sole org when no slug and no default are configured", async () => {
    findMany.mockResolvedValue([{ id: "org-only" }]);

    const result = await resolveOrgForPublicSignup();

    expect(result).toEqual({ ok: true, orgId: "org-only" });
  });

  it("falls through to the sole org when DEFAULT_ORG_SLUG is stale", async () => {
    process.env.DEFAULT_ORG_SLUG = "deleted-org";
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([{ id: "org-only" }]);

    const result = await resolveOrgForPublicSignup();

    expect(result).toEqual({ ok: true, orgId: "org-only" });
  });

  it("refuses when multiple orgs exist and nothing disambiguates them", async () => {
    findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    const result = await resolveOrgForPublicSignup();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("503s when no org exists at all", async () => {
    findMany.mockResolvedValue([]);

    const result = await resolveOrgForPublicSignup();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });
});
