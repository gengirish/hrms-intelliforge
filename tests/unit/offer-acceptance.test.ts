import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const updateMany = vi.fn();
const notify = vi.fn();
const scheduleLearningProvision = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intern: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  notify: (...args: unknown[]) => notify(...args),
}));

vi.mock("@/lib/learning-provision", () => ({
  scheduleLearningProvision: (...args: unknown[]) => scheduleLearningProvision(...args),
}));

import { acceptOffer, isAcceptanceReply } from "@/lib/offer-acceptance";

function intern(overrides: Record<string, unknown> = {}) {
  return {
    id: "intern-1",
    orgId: "org-1",
    name: "Asha",
    status: "OFFERED",
    deactivated: false,
    startDate: new Date("2026-10-01T00:00:00+05:30"),
    acceptedAt: null,
    ...overrides,
  };
}

describe("isAcceptanceReply — whatsapp", () => {
  it.each([
    ["ACCEPT"],
    ["accept"],
    ["I Accept"],
    ["  i   accept  "],
    ["Yes"],
    ["yes!"],
    ["Agree"],
    ["I agree"],
    ["Confirm"],
    ["Confirmed, thanks"],
    ["Yes, I accept the offer."],
  ])("accepts %j", (text) => {
    expect(isAcceptanceReply(text, "whatsapp")).toBe(true);
  });

  it.each([
    [""],
    ["   "],
    ["hello"],
    ["what are my tasks today"],
    ["I don't accept"],
    ["I don’t accept"],
    ["I do not agree"],
    ["no"],
    ["Not yet, need to confirm with family"],
    ["I decline"],
    ["I can't accept this"],
    ["yesterday was fine"],
    ["acceptance criteria?"],
    ["confirmation pending"],
  ])("rejects %j", (text) => {
    expect(isAcceptanceReply(text, "whatsapp")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isAcceptanceReply(null, "whatsapp")).toBe(false);
    expect(isAcceptanceReply(undefined, "whatsapp")).toBe(false);
  });
});

describe("isAcceptanceReply — email", () => {
  it.each([
    ["I Accept"],
    ["i accept"],
    ["Hi team,\n\nI  accept the offer.\n\nRegards,\nAsha"],
    ["I hereby accept"],
  ])("accepts %j", (text) => {
    expect(isAcceptanceReply(text, "email")).toBe(true);
  });

  it.each([
    ["Yes"],
    ["I agree"],
    ["Confirm"],
    ["I don't accept"],
    ["I do not accept the offer"],
    ["I cannot accept at this time"],
    ["Thanks, will reply soon"],
    // Quoted offer letter must not trigger acceptance.
    ['Can I get more time?\n\nOn Mon, 1 Sep 2026 at 10:00, HR wrote:\n> Reply "I Accept" to confirm'],
    ['Question about stipend\n> Please reply with "I Accept"'],
  ])("rejects %j", (text) => {
    expect(isAcceptanceReply(text, "email")).toBe(false);
  });
});

describe("acceptOffer", () => {
  beforeEach(() => {
    findUnique.mockReset();
    updateMany.mockReset();
    notify.mockReset();
    scheduleLearningProvision.mockReset();
    notify.mockResolvedValue({ emailSent: false });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves an OFFERED intern to ACTIVE, provisions learning and notifies", async () => {
    findUnique.mockResolvedValue(intern());
    updateMany.mockResolvedValue({ count: 1 });

    const result = await acceptOffer({ internId: "intern-1", source: "WHATSAPP" });

    expect(result.outcome).toBe("accepted");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "intern-1", status: "OFFERED", deactivated: false },
      data: { status: "ACTIVE", acceptedAt: expect.any(Date) },
    });
    expect(scheduleLearningProvision).toHaveBeenCalledWith("intern-1", undefined);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("intern-1", "OFFER_ACCEPTED", {
      startDate: expect.any(String),
    });
  });

  it("forwards adminId to learning provisioning", async () => {
    findUnique.mockResolvedValue(intern());
    updateMany.mockResolvedValue({ count: 1 });

    await acceptOffer({ internId: "intern-1", source: "ADMIN", orgId: "org-1", adminId: "admin-9" });

    expect(scheduleLearningProvision).toHaveBeenCalledWith("intern-1", "admin-9");
  });

  it("still reports accepted when notify throws", async () => {
    findUnique.mockResolvedValue(intern());
    updateMany.mockResolvedValue({ count: 1 });
    notify.mockRejectedValue(new Error("boom"));

    const result = await acceptOffer({ internId: "intern-1", source: "EMAIL" });

    expect(result.outcome).toBe("accepted");
  });

  it("is a no-op for an already ACTIVE intern", async () => {
    findUnique.mockResolvedValue(intern({ status: "ACTIVE" }));

    const result = await acceptOffer({ internId: "intern-1", source: "PORTAL" });

    expect(result.outcome).toBe("already_active");
    expect(updateMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(scheduleLearningProvision).not.toHaveBeenCalled();
  });

  it("never accepts a deactivated intern", async () => {
    findUnique.mockResolvedValue(intern({ deactivated: true }));

    const result = await acceptOffer({ internId: "intern-1", source: "WHATSAPP" });

    expect(result.outcome).toBe("deactivated");
    expect(updateMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it.each([["PENDING"], ["COMPLETED"]])("refuses an intern in %s", async (status) => {
    findUnique.mockResolvedValue(intern({ status }));

    const result = await acceptOffer({ internId: "intern-1", source: "ESIGN" });

    expect(result.outcome).toBe("invalid_status");
    expect(updateMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing intern", async () => {
    findUnique.mockResolvedValue(null);

    const result = await acceptOffer({ internId: "nope", source: "EMAIL" });

    expect(result.outcome).toBe("not_found");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns not_found for an intern in another org", async () => {
    findUnique.mockResolvedValue(intern({ orgId: "org-other" }));

    const result = await acceptOffer({ internId: "intern-1", source: "ADMIN", orgId: "org-1" });

    expect(result.outcome).toBe("not_found");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not re-run side effects when a concurrent accept won the race", async () => {
    findUnique
      .mockResolvedValueOnce(intern())
      .mockResolvedValueOnce(intern({ status: "ACTIVE" }));
    updateMany.mockResolvedValue({ count: 0 });

    const result = await acceptOffer({ internId: "intern-1", source: "EMAIL" });

    expect(result.outcome).toBe("already_active");
    expect(notify).not.toHaveBeenCalled();
    expect(scheduleLearningProvision).not.toHaveBeenCalled();
  });
});
