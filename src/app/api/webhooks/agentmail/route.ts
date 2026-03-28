import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event === "message.received") {
      const { inboxId, extractedText } = body.message || {};

      if (!inboxId) {
        return NextResponse.json({ ok: true });
      }

      const intern = await prisma.intern.findFirst({
        where: { agentmailInboxId: inboxId },
      });

      if (!intern) {
        return NextResponse.json({ ok: true });
      }

      const text = (extractedText || "").toLowerCase();

      if (
        intern.status === "OFFERED" &&
        (text.includes("accept") ||
          text.includes("yes") ||
          text.includes("agree") ||
          text.includes("confirm"))
      ) {
        await prisma.intern.update({
          where: { id: intern.id },
          data: { acceptedAt: new Date(), status: "ACTIVE" },
        });
        console.log(`Intern ${intern.name} auto-accepted via email reply`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
