import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { OfferLetterPDF, CompletionCertPDF } from "@/lib/pdf";
import {
  sendOfferLetter,
  sendTaskReminder,
  sendCompletionEmail,
} from "@/lib/agentmail";
import { formatINR, formatDateIST } from "@/lib/utils";
import React, { type ReactElement } from "react";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, internId } = body;

    if (!action || !internId) {
      return NextResponse.json(
        { error: "action and internId required" },
        { status: 400 }
      );
    }

    const intern = await prisma.intern.findUnique({ where: { id: internId } });
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (action === "update_stipend") {
      const { stipendPaise } = body;
      await prisma.intern.update({
        where: { id: internId },
        data: { stipendPaise },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "send_offer") {
      if (!intern.agentmailInboxId) {
        return NextResponse.json(
          { error: "Intern has no AgentMail inbox. Re-submit onboarding." },
          { status: 400 }
        );
      }

      if (intern.stipendPaise === 0) {
        return NextResponse.json(
          { error: "Set the stipend amount before sending the offer." },
          { status: 400 }
        );
      }

      const stipendINR = formatINR(intern.stipendPaise);
      const startDateStr = formatDateIST(intern.startDate);

      const pdfElement = React.createElement(OfferLetterPDF, {
        internName: intern.name,
        role: intern.role,
        stipendINR,
        startDate: startDateStr,
        durationWeeks: intern.durationWeeks,
        college: intern.college,
      });
      const pdfBuffer = await renderToBuffer(pdfElement as unknown as ReactElement);

      const pdfBase64 = pdfBuffer.toString("base64");

      await sendOfferLetter({
        inboxId: intern.agentmailInboxId,
        internEmail: intern.email,
        internName: intern.name,
        role: intern.role,
        stipendPaise: intern.stipendPaise,
        startDate: startDateStr,
        pdfBase64,
      });

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "OFFERED" },
      });

      return NextResponse.json({ ok: true, status: "OFFERED" });
    }

    if (action === "send_reminder") {
      if (!intern.agentmailInboxId) {
        return NextResponse.json(
          { error: "Intern has no AgentMail inbox." },
          { status: 400 }
        );
      }

      await sendTaskReminder(
        intern.agentmailInboxId,
        intern.email,
        intern.name
      );

      return NextResponse.json({ ok: true });
    }

    if (action === "mark_complete") {
      if (!intern.agentmailInboxId) {
        return NextResponse.json(
          { error: "Intern has no AgentMail inbox." },
          { status: 400 }
        );
      }

      const startDateStr = formatDateIST(intern.startDate);

      const certElement = React.createElement(CompletionCertPDF, {
        internName: intern.name,
        role: intern.role,
        startDate: startDateStr,
        durationWeeks: intern.durationWeeks,
        college: intern.college,
      });
      const pdfBuffer = await renderToBuffer(certElement as unknown as ReactElement);

      const pdfBase64 = pdfBuffer.toString("base64");

      await sendCompletionEmail(
        intern.agentmailInboxId,
        intern.email,
        intern.name,
        pdfBase64
      );

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "COMPLETED" },
      });

      return NextResponse.json({ ok: true, status: "COMPLETED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Dashboard action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
