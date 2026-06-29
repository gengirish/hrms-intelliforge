import { writeFileSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { OfferLetterPDF } from "../src/lib/pdf";

// @react-pdf JSX outside Next.js needs React in scope
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const el = React.createElement(OfferLetterPDF, {
  internName: "Priya Sharma",
  role: "AI/ML Intern",
  stipendINR: "₹15,000",
  startDate: "15 July 2026",
  durationWeeks: 12,
  college: "IIIT Hyderabad",
});

const buf = await renderToBuffer(el);
const out = "offer-letter-preview.pdf";
writeFileSync(out, buf);
console.log(`Wrote ${out} (${buf.length} bytes)`);
