import { prisma } from "@/lib/prisma";

export type WebhookProvider =
  | "stripe"
  | "razorpay"
  | "digio"
  | "whatsapp"
  | "agentmail";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Records that a provider event is being processed. Call it after the
 * signature check and before any side effect.
 *
 * Returns true when this delivery owns the event, false when the same
 * (provider, eventId) was already claimed — i.e. a retry to acknowledge with
 * 200 and otherwise ignore. Any other database error propagates so the handler
 * can answer 5xx and let the provider retry.
 */
export async function claimWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  orgId?: string | null
): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: { provider, eventId, orgId: orgId ?? null },
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/**
 * Runs `process` at most once per (provider, eventId). Returns false without
 * running it when the event was already claimed. If `process` throws, the
 * claim is released before the error is rethrown so a retry can reprocess.
 */
export async function processWebhookEventOnce(
  provider: WebhookProvider,
  eventId: string,
  process: () => Promise<void>
): Promise<boolean> {
  if (!(await claimWebhookEvent(provider, eventId))) return false;
  try {
    await process();
  } catch (err) {
    await releaseWebhookEvent(provider, eventId);
    throw err;
  }
  return true;
}

/**
 * Drops a claim after processing failed, so the provider's retry is processed
 * instead of being skipped as a duplicate. Never throws: a failed release must
 * not mask the original processing error.
 */
export async function releaseWebhookEvent(
  provider: WebhookProvider,
  eventId: string
): Promise<void> {
  try {
    await prisma.webhookEvent.deleteMany({ where: { provider, eventId } });
  } catch (err) {
    console.error(
      `[webhook-idempotency] failed to release ${provider}:${eventId}`,
      err
    );
  }
}
