import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseSenderEmail(from: unknown): string | null {
  if (!from) return null;
  if (typeof from === "string") return from.trim().toLowerCase() || null;
  if (typeof from === "object" && from !== null && "address" in from) {
    const a = (from as { address?: string }).address;
    return a?.trim().toLowerCase() || null;
  }
  if (Array.isArray(from) && from.length > 0) {
    const first = from[0];
    if (typeof first === "object" && first !== null && "email" in first) {
      const e = (first as { email?: string }).email;
      return e?.trim().toLowerCase() || null;
    }
  }
  return null;
}

function indicatesOfferAcceptance(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bi\s+accept\b/i.test(text) ||
    /\byes\b/.test(lower) ||
    /\bagree\b/.test(lower) ||
    /\bconfirm\b/.test(lower)
  );
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const eventType = body.event ?? body.event_type;
    if (eventType === "message.received") {
      const msg = body.message || {};
      const { from, extractedText, text: msgText } = msg;
      const bodyText = (extractedText || msgText || "").toString();

      const senderEmail = parseSenderEmail(from);
      if (!senderEmail) {
        return NextResponse.json({ ok: true });
      }

      const intern = await prisma.intern.findFirst({
        where: { email: { equals: senderEmail, mode: "insensitive" } },
      });

      if (!intern) {
        return NextResponse.json({ ok: true });
      }

      if (intern.status === "OFFERED" && indicatesOfferAcceptance(bodyText)) {
        await prisma.intern.update({
          where: { id: intern.id },
          data: { acceptedAt: new Date(), status: "ACTIVE" },
        });
        console.log(`Intern ${intern.name} auto-accepted via email reply`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
