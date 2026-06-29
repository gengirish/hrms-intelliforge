import { renderToBuffer } from "@react-pdf/renderer";
import { OfferLetterPDF } from "@/lib/pdf";
import { formatINR, formatDateIST } from "@/lib/utils";
import React, { type ReactElement } from "react";

export type InternOfferPdfFields = {
  name: string;
  role: string;
  stipendPaise: number;
  startDate: Date;
  durationWeeks: number;
  college: string;
};

export async function generateOfferPdfBuffer(
  intern: InternOfferPdfFields
): Promise<Buffer> {
  const pdfElement = React.createElement(OfferLetterPDF, {
    internName: intern.name,
    role: intern.role,
    stipendINR: formatINR(intern.stipendPaise),
    startDate: formatDateIST(intern.startDate),
    durationWeeks: intern.durationWeeks,
    college: intern.college,
  });
  return renderToBuffer(pdfElement as unknown as ReactElement);
}
