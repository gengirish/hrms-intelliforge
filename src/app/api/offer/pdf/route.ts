import { NextRequest, NextResponse } from "next/server";
import { getAuthIntern } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { renderToBuffer } from "@react-pdf/renderer";
import { OfferLetterPDF } from "@/lib/pdf";
import { formatINR, formatDateIST } from "@/lib/utils";
import React, { type ReactElement } from "react";

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 5, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (intern.status === "PENDING") {
      return NextResponse.json(
        { error: "Your offer letter has not been sent yet." },
        { status: 404 }
      );
    }

    if (intern.stipendPaise === 0) {
      return NextResponse.json(
        { error: "Offer details are incomplete." },
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

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="IntelliForge_Offer_Letter_${intern.name.replace(/\s+/g, "_")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    return serverError(err, "Offer PDF error");
  }
}
