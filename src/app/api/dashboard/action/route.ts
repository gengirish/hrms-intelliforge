import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { actionSchema } from "@/lib/validations";
import { renderToBuffer } from "@react-pdf/renderer";
import { OfferLetterPDF, CompletionCertPDF } from "@/lib/pdf";
import { notify } from "@/lib/notifications";
import { formatINR, formatDateIST } from "@/lib/utils";
import React, { type ReactElement } from "react";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
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
    if (!intern || intern.orgId !== admin.orgId) {
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
      if (intern.status !== "PENDING") {
        return NextResponse.json(
          { error: `Cannot send offer — intern status is "${intern.status}" (expected PENDING).` },
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

      let pdfBase64: string;
      try {
        const pdfElement = React.createElement(OfferLetterPDF, {
          internName: intern.name,
          role: intern.role,
          stipendINR,
          startDate: startDateStr,
          durationWeeks: intern.durationWeeks,
          college: intern.college,
        });
        const pdfBuffer = await renderToBuffer(pdfElement as unknown as ReactElement);
        pdfBase64 = pdfBuffer.toString("base64");
      } catch (pdfErr) {
        console.error("PDF render failed:", pdfErr);
        return NextResponse.json(
          { error: "Failed to generate the offer letter PDF. Please try again." },
          { status: 500 }
        );
      }

      const result = await notify(internId, "OFFER_LETTER", {
        stipendPaise: intern.stipendPaise,
        startDate: startDateStr,
        pdfBase64,
      });

      if (!result.emailSent) {
        return NextResponse.json(
          { error: `Offer letter email failed: ${result.emailError || "Unknown error"}. Status was NOT changed.` },
          { status: 502 }
        );
      }

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "OFFERED" },
      });

      return NextResponse.json({ ok: true, status: "OFFERED" });
    }

    if (action === "approve_offer") {
      if (intern.status !== "OFFERED") {
        return NextResponse.json(
          { error: `Cannot approve — intern status is "${intern.status}" (expected OFFERED).` },
          { status: 400 }
        );
      }

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "ACTIVE", acceptedAt: new Date() },
      });

      try {
        await notify(internId, "OFFER_ACCEPTED", {
          startDate: formatDateIST(intern.startDate),
        });
      } catch {
        // non-critical — status is already updated
      }

      return NextResponse.json({ ok: true, status: "ACTIVE" });
    }

    if (action === "send_reminder") {
      await notify(internId, "TASK_REMINDER");
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_complete") {
      if (intern.status !== "ACTIVE") {
        return NextResponse.json(
          { error: `Cannot mark complete — intern status is "${intern.status}" (expected ACTIVE).` },
          { status: 400 }
        );
      }

      const startDateStr = formatDateIST(intern.startDate);

      let pdfBase64: string;
      try {
        const certElement = React.createElement(CompletionCertPDF, {
          internName: intern.name,
          role: intern.role,
          startDate: startDateStr,
          durationWeeks: intern.durationWeeks,
          college: intern.college,
        });
        const pdfBuffer = await renderToBuffer(certElement as unknown as ReactElement);
        pdfBase64 = pdfBuffer.toString("base64");
      } catch (pdfErr) {
        console.error("Certificate PDF render failed:", pdfErr);
        return NextResponse.json(
          { error: "Failed to generate the completion certificate PDF. Please try again." },
          { status: 500 }
        );
      }

      const result = await notify(internId, "COMPLETION_CERT", { pdfBase64 });
      if (!result.emailSent) {
        console.error("Completion cert email failed:", result.emailError);
      }

      await prisma.intern.update({
        where: { id: internId },
        data: { status: "COMPLETED" },
      });

      return NextResponse.json({ ok: true, status: "COMPLETED" });
    }

    if (action === "deactivate") {
      await prisma.intern.update({
        where: { id: internId },
        data: { deactivated: true, deactivatedAt: new Date() },
      });
      return NextResponse.json({ ok: true, deactivated: true });
    }

    if (action === "reactivate") {
      await prisma.intern.update({
        where: { id: internId },
        data: { deactivated: false, deactivatedAt: null },
      });
      return NextResponse.json({ ok: true, deactivated: false });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return serverError(err, "Dashboard action error");
  }
}
