import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { actionSchema } from "@/lib/validations";
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
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { action, internId, stipendPaise } = parsed.data;

    if (action === "update_stipend" && stipendPaise === undefined) {
      return NextResponse.json(
        { error: "stipendPaise required for update_stipend" },
        { status: 400 }
      );
    }

    const intern = await prisma.intern.findUnique({ where: { id: internId } });
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (action === "update_stipend") {
      await prisma.intern.update({
        where: { id: internId },
        data: { stipendPaise: stipendPaise! },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "send_offer") {
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
      await sendTaskReminder(intern.email, intern.name);
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_complete") {
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

      await sendCompletionEmail(intern.email, intern.name, pdfBase64);

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "COMPLETED" },
      });

      return NextResponse.json({ ok: true, status: "COMPLETED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return serverError(err, "Dashboard action error");
  }
}
