import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWhatsAppSignature,
  formatPhoneE164,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { formatDateIST } from "@/lib/utils";
import { parseIntent } from "@/lib/wa-bot/intent-parser";
import { executeIntent } from "@/lib/wa-bot/executor";
import { scheduleLearningProvision } from "@/lib/learning-provision";

function indicatesOfferAcceptance(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bi\s+accept\b/i.test(text) ||
    /\byes\b/.test(lower) ||
    /\bagree\b/.test(lower) ||
    /\bconfirm\b/.test(lower)
  );
}

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

export async function POST(req: NextRequest) {
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
          const e164 = formatPhoneE164(msg.from);
          const last10 = e164.replace(/^\+/, "").slice(-10);

          const intern = await prisma.intern.findFirst({
            where: { phone: { contains: last10 } },
          });

          if (!intern) continue;

          if (intern.status === "OFFERED" && indicatesOfferAcceptance(bodyText)) {
            await prisma.intern.update({
              where: { id: intern.id },
              data: { status: "ACTIVE", acceptedAt: new Date() },
            });
            scheduleLearningProvision(intern.id);
            await sendWhatsAppTemplate(e164, "offer_accepted", "en", [
              intern.name,
              formatDateIST(intern.startDate),
            ]);
            console.info(
              `[whatsapp-webhook] Intern ${intern.name} auto-accepted via WhatsApp`
            );
            continue;
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

        for (const status of value.statuses ?? []) {
          if (!status.id || !status.status) continue;
          const at = statusTimestampMs(status.timestamp);
          const st = status.status.toLowerCase();

          if (st === "sent") {
            await prisma.notificationLog.updateMany({
              where: { externalId: status.id },
              data: { status: "SENT", sentAt: at },
            });
          } else if (st === "delivered") {
            await prisma.notificationLog.updateMany({
              where: { externalId: status.id },
              data: { status: "DELIVERED", deliveredAt: at },
            });
          } else if (st === "read") {
            await prisma.notificationLog.updateMany({
              where: { externalId: status.id },
              data: { status: "READ", readAt: at },
            });
          } else if (st === "failed") {
            await prisma.notificationLog.updateMany({
              where: { externalId: status.id },
              data: {
                status: "FAILED",
                errorDetail: JSON.stringify(
                  status.errors !== undefined ? status.errors : null
                ),
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook processing failed:", err);
  }

  return NextResponse.json({ ok: true });
}
