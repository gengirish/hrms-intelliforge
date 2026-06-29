import { NextRequest, NextResponse } from "next/server";
import { EsignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, parseDigioWebhookEvent } from "@/lib/esign";
import { notify } from "@/lib/notifications";
import { scheduleLearningProvision } from "@/lib/learning-provision";
import { formatDateIST } from "@/lib/utils";

function mapWebhookToStatus(
  eventType: string,
  documentStatus?: string
): EsignStatus | null {
  const event = eventType.toLowerCase();
  const doc = (documentStatus ?? "").toLowerCase();

  if (
    event.includes("signed") ||
    event.includes("completed") ||
    doc === "completed" ||
    doc === "signed"
  ) {
    return "SIGNED";
  }
  if (event.includes("declined") || event.includes("rejected") || doc === "declined") {
    return "DECLINED";
  }
  if (event.includes("expired") || doc === "expired") {
    return "EXPIRED";
  }
  if (event.includes("failed") || doc === "failed") {
    return "FAILED";
  }
  return null;
}

async function completeOfferAcceptance(internId: string) {
  const intern = await prisma.intern.findUnique({ where: { id: internId } });
  if (!intern) return;
  if (intern.status === "ACTIVE" || intern.status === "COMPLETED") return;

  await prisma.intern.update({
    where: { id: internId },
    data: { status: "ACTIVE", acceptedAt: new Date() },
  });

  scheduleLearningProvision(internId);

  try {
    await notify(internId, "OFFER_ACCEPTED", {
      startDate: formatDateIST(intern.startDate),
    });
  } catch {
    // non-critical
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyWebhookSignature(req.headers, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const { eventType, providerDocId, documentStatus, signedPdfUrl, signedAt } =
      parseDigioWebhookEvent(rawBody);

    if (!providerDocId) {
      console.warn("[digio webhook] Missing providerDocId", { eventType });
      return NextResponse.json({ ok: true, skipped: "no_document_id" });
    }

    const esignRequest = await prisma.offerEsignRequest.findFirst({
      where: { providerDocId },
      orderBy: { createdAt: "desc" },
    });

    if (!esignRequest) {
      console.warn("[digio webhook] Unknown document", { providerDocId, eventType });
      return NextResponse.json({ ok: true, skipped: "unknown_document" });
    }

    const nextStatus = mapWebhookToStatus(eventType, documentStatus);
    if (!nextStatus) {
      return NextResponse.json({ ok: true, skipped: "unhandled_event", eventType });
    }

    if (esignRequest.status === nextStatus) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await prisma.offerEsignRequest.update({
      where: { id: esignRequest.id },
      data: {
        status: nextStatus,
        signedPdfUrl: signedPdfUrl ?? esignRequest.signedPdfUrl,
        signedAt:
          nextStatus === "SIGNED"
            ? signedAt ?? new Date()
            : esignRequest.signedAt,
      },
    });

    if (nextStatus === "SIGNED") {
      const intern = await prisma.intern.findUnique({
        where: { id: esignRequest.internId },
      });

      if (intern && intern.status === "PENDING") {
        await prisma.intern.update({
          where: { id: intern.id },
          data: { status: "OFFERED" },
        });
      }

      await completeOfferAcceptance(esignRequest.internId);
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err: unknown) {
    console.error("Digio webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
