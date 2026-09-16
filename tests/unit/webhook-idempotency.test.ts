import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      create: (...args: unknown[]) => create(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));

import {
  claimWebhookEvent,
  processWebhookEventOnce,
  releaseWebhookEvent,
} from "@/lib/webhook-idempotency";

function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

describe("webhook idempotency", () => {
  beforeEach(() => {
    create.mockReset();
    deleteMany.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("claimWebhookEvent", () => {
    it("claims a new event", async () => {
      create.mockResolvedValue({ id: "we-1" });

      await expect(claimWebhookEvent("stripe", "evt_1")).resolves.toBe(true);
      expect(create).toHaveBeenCalledWith({
        data: { provider: "stripe", eventId: "evt_1", orgId: null },
      });
    });

    it("records the org when known", async () => {
      create.mockResolvedValue({ id: "we-1" });

      await claimWebhookEvent("digio", "WHK_1", "org-1");
      expect(create).toHaveBeenCalledWith({
        data: { provider: "digio", eventId: "WHK_1", orgId: "org-1" },
      });
    });

    it("returns false for a duplicate (P2002)", async () => {
      create.mockRejectedValue(uniqueViolation());

      await expect(claimWebhookEvent("stripe", "evt_1")).resolves.toBe(false);
    });

    it("rethrows other database errors", async () => {
      const err = Object.assign(new Error("connection lost"), { code: "P1001" });
      create.mockRejectedValue(err);

      await expect(claimWebhookEvent("stripe", "evt_1")).rejects.toBe(err);
    });
  });

  describe("releaseWebhookEvent", () => {
    it("deletes the claim", async () => {
      deleteMany.mockResolvedValue({ count: 1 });

      await releaseWebhookEvent("razorpay", "evt_2");
      expect(deleteMany).toHaveBeenCalledWith({
        where: { provider: "razorpay", eventId: "evt_2" },
      });
    });

    it("swallows release failures", async () => {
      deleteMany.mockRejectedValue(new Error("db down"));

      await expect(releaseWebhookEvent("razorpay", "evt_2")).resolves.toBeUndefined();
    });
  });

  describe("processWebhookEventOnce", () => {
    it("runs the processor for a new event", async () => {
      create.mockResolvedValue({ id: "we-1" });
      const run = vi.fn().mockResolvedValue(undefined);

      await expect(processWebhookEventOnce("whatsapp", "msg:wamid.1", run)).resolves.toBe(true);
      expect(run).toHaveBeenCalledOnce();
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("skips the processor for a duplicate", async () => {
      create.mockRejectedValue(uniqueViolation());
      const run = vi.fn();

      await expect(processWebhookEventOnce("whatsapp", "msg:wamid.1", run)).resolves.toBe(false);
      expect(run).not.toHaveBeenCalled();
    });

    it("releases the claim and rethrows when processing fails", async () => {
      create.mockResolvedValue({ id: "we-1" });
      deleteMany.mockResolvedValue({ count: 1 });
      const err = new Error("boom");

      await expect(
        processWebhookEventOnce("whatsapp", "msg:wamid.1", () => Promise.reject(err))
      ).rejects.toBe(err);
      expect(deleteMany).toHaveBeenCalledWith({
        where: { provider: "whatsapp", eventId: "msg:wamid.1" },
      });
    });
  });
});
