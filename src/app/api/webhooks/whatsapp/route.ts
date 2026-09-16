import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import {
  verifyWhatsAppSignature,
  formatPhoneE164,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { whatsAppHubTenantId } from "@/lib/whatsapp-hub";
import { parseIntent } from "@/lib/wa-bot/intent-parser";
import { executeIntent } from "@/lib/wa-bot/executor";
import { processWebhookEventOnce } from "@/lib/webhook-idempotency";
import { acceptOffer, isAcceptanceReply } from "@/lib/offer-acceptance";

function statusTimestampMs(ts: string | number | undefined): Date {
  const n = typeof ts === "string" ? parseInt(ts, 10) : Number(ts);
  return new Date(Number.isFinite(n) ? n * 1000 : Date.now());
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("Bad Request", { status: 400 });
}

type WaStatus = {
  id?: string;
  status?: string;
  timestamp?: string | number;
  errors?: unknown;
};

type WaTextMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  id?: string;
};

/** One inbound text, from either transport. */
async function handleInboundText(e164: string, bodyText: string): Promise<void> {
  const last10 = e164.replace(/^\+/, "").slice(-10);

  const intern = await prisma.intern.findFirst({
    where: { phone: { contains: last10 } },
  });

  if (!intern) return;

  if (intern.status === "OFFERED" && isAcceptanceReply(bodyText, "whatsapp")) {
    // The offer_accepted confirmation goes out via notify() inside acceptOffer.
    await acceptOffer({ internId: intern.id, source: "WHATSAPP" });
    return;
  }

  const startMs = Date.now();
  const intent = await parseIntent(bodyText);
  const response = await executeIntent(intern, intent);
  const latencyMs = Date.now() - startMs;

  await Promise.all([
    sendWhatsAppText(e164, response),
    prisma.botInteractionLog.create({
      data: {
        internId: intern.id,
        channel: "WHATSAPP",
        input: bodyText,
        intent: intent.action,
        response,
        success: intent.action !== "UNKNOWN",
        latencyMs,
      },
    }),
  ]);

  console.info(
    `[wa-bot] ${intern.name}: "${bodyText}" → ${intent.action} (${latencyMs}ms)`
  );
}

/** One delivery-status update, from either transport. */
async function applyStatusUpdate(
  waMessageId: string,
  statusRaw: string,
  at: Date,
  errors?: unknown
): Promise<void> {
  const st = statusRaw.toLowerCase();

  if (st === "sent") {
    await prisma.notificationLog.updateMany({
      where: { externalId: waMessageId },
      data: { status: "SENT", sentAt: at },
    });
  } else if (st === "delivered") {
    await prisma.notificationLog.updateMany({
      where: { externalId: waMessageId },
      data: { status: "DELIVERED", deliveredAt: at },
    });
  } else if (st === "read") {
    await prisma.notificationLog.updateMany({
      where: { externalId: waMessageId },
      data: { status: "READ", readAt: at },
    });
  } else if (st === "failed") {
    await prisma.notificationLog.updateMany({
      where: { externalId: waMessageId },
      data: {
        status: "FAILED",
        errorDetail: JSON.stringify(errors !== undefined ? errors : null),
      },
    });
  }
}

/**
 * Events forwarded by the central hub, which normalises Meta's payload to
 * { type, tenantId, message?, status? } and identifies itself by header rather
 * than by Meta's signature — the hub holds the app secret, we never see it.
 */
async function handleHubForward(req: NextRequest): Promise<NextResponse> {
  const tenantId = req.headers.get("x-whatsapp-hub-tenant");
  if (tenantId !== whatsAppHubTenantId()) {
    return NextResponse.json({ error: "tenant_mismatch" }, { status: 403 });
  }

  // Swallow a malformed forward rather than 500 back at the hub, which retries.
  const payload = (await req.json().catch(() => null)) as {
    type?: string;
    message?: { fromE164?: string; text?: string | null; type?: string; waMessageId?: string };
    status?: { waMessageId?: string; status?: string; updatedAtIst?: string };
  } | null;

  if (!payload) return NextResponse.json({ ok: true });

  try {
    const msg = payload.message;
    if (msg?.fromE164 && msg.type === "text" && msg.text) {
      const [from, text] = [formatPhoneE164(msg.fromE164), msg.text];
      const run = () => handleInboundText(from, text);
      if (msg.waMessageId) await processWebhookEventOnce("whatsapp", `msg:${msg.waMessageId}`, run);
      else await run();
    }

    const status = payload.status;
    if (status?.waMessageId && status.status) {
      const parsed = status.updatedAtIst ? new Date(status.updatedAtIst) : null;
      const at = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
      const [id, st] = [status.waMessageId, status.status];
      await processWebhookEventOnce("whatsapp", `status:${id}:${st}`, () =>
        applyStatusUpdate(id, st, at)
      );
    }
  } catch (err) {
    console.error("WhatsApp hub forward processing failed:", err);
    Sentry.captureException(err, { tags: { webhook: "whatsapp" } });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // The hub identifies itself by tenant header; Meta signs the raw body. Both
  // are accepted so the cutover needs no coordinated flip.
  if (req.headers.get("x-whatsapp-hub-tenant") !== null) {
    return handleHubForward(req);
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifyWhatsAppSignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("WhatsApp webhook: invalid JSON", e);
    return NextResponse.json({ ok: true });
  }

  try {
    const root = payload as {
      entry?: {
        changes?: {
          value?: {
            messages?: WaTextMessage[];
            statuses?: WaStatus[];
          };
        }[];
      }[];
    };

    const entries = root.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        for (const msg of value.messages ?? []) {
          if (msg.type !== "text" || !msg.from) continue;
          const bodyText = (msg.text?.body ?? "").toString();
          const from = formatPhoneE164(msg.from);
          const run = () => handleInboundText(from, bodyText);
          if (msg.id) await processWebhookEventOnce("whatsapp", `msg:${msg.id}`, run);
          else await run();
        }

        for (const status of value.statuses ?? []) {
          if (!status.id || !status.status) continue;
          const [id, st] = [status.id, status.status];
          await processWebhookEventOnce("whatsapp", `status:${id}:${st}`, () =>
            applyStatusUpdate(id, st, statusTimestampMs(status.timestamp), status.errors)
          );
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook processing failed:", err);
    Sentry.captureException(err, { tags: { webhook: "whatsapp" } });
  }

  return NextResponse.json({ ok: true });
}
