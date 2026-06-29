import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import type { StipendPayoutStatus } from "@prisma/client";

function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

function mapRazorpayPayoutStatus(rzStatus: string): StipendPayoutStatus {
  switch (rzStatus) {
    case "processed":
      return "PROCESSED";
    case "failed":
    case "reversed":
    case "cancelled":
      return "FAILED";
    case "queued":
    case "pending":
    case "processing":
    default:
      return "PROCESSING";
  }
}

async function refreshBatchStatus(batchId: string) {
  const payouts = await prisma.stipendPayout.findMany({
    where: { batchId },
    select: { status: true },
  });

  if (payouts.length === 0) return;

  const allProcessed = payouts.every((p) => p.status === "PROCESSED");
  const allFailed = payouts.every((p) => p.status === "FAILED");
  const allTerminal = payouts.every((p) =>
    ["PROCESSED", "FAILED", "CANCELLED"].includes(p.status)
  );

  let batchStatus: StipendPayoutStatus;
  if (allProcessed) {
    batchStatus = "PROCESSED";
  } else if (allFailed) {
    batchStatus = "FAILED";
  } else if (allTerminal) {
    batchStatus = "PROCESSED";
  } else {
    batchStatus = "PROCESSING";
  }

  await prisma.stipendPayoutBatch.update({
    where: { id: batchId },
    data: {
      status: batchStatus,
      ...(allTerminal ? { processedAt: new Date() } : {}),
    },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!signature || !verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
    console.error("Razorpay webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: {
      payout?: {
        entity?: {
          id?: string;
          status?: string;
          failure_reason?: string;
          reference_id?: string;
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event ?? "";
  if (!event.startsWith("payout.")) {
    return NextResponse.json({ received: true });
  }

  const entity = payload.payload?.payout?.entity;
  if (!entity?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    const payout = await prisma.stipendPayout.findFirst({
      where: {
        OR: [
          { razorpayPayoutId: entity.id },
          ...(entity.reference_id
            ? [{ id: entity.reference_id }]
            : []),
        ],
      },
    });

    if (!payout) {
      console.warn(`[razorpay] Unknown payout ${entity.id}`);
      return NextResponse.json({ received: true });
    }

    const status = mapRazorpayPayoutStatus(entity.status ?? "processing");

    await prisma.stipendPayout.update({
      where: { id: payout.id },
      data: {
        status,
        failureReason:
          status === "FAILED"
            ? entity.failure_reason ?? "Payout failed"
            : null,
      },
    });

    await refreshBatchStatus(payout.batchId);
    console.info(
      `[razorpay] Payout ${entity.id} → ${status} (event: ${event})`
    );
  } catch (err) {
    console.error("Razorpay webhook processing error:", err);
  }

  return NextResponse.json({ received: true });
}
