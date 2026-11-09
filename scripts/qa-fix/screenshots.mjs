// Before/after screenshots for the QA handover (docs/qa-fix/HANDOVER.md).
// Read-only: it only loads public pages (GET) and never submits a form.
//
//   node scripts/qa-fix/screenshots.mjs <label> <baseUrl>
//   node scripts/qa-fix/screenshots.mjs before https://hrms.intelliforge.tech
//   node scripts/qa-fix/screenshots.mjs after  http://localhost:3011
//
// Writes docs/qa-fix/screenshots/<label>/{home-hero,pricing,create-org-starter,mentors}.png

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [label, baseUrl] = process.argv.slice(2);
if (!label || !baseUrl) {
  console.error("Usage: node scripts/qa-fix/screenshots.mjs <label> <baseUrl>");
  process.exit(1);
}

const SHOTS = [
  { name: "home-hero", path: "/", fullPage: false },
  { name: "pricing", path: "/pricing", fullPage: true },
  { name: "create-org-starter", path: "/create-org?plan=starter", fullPage: false },
  { name: "mentors", path: "/mentors", fullPage: true },
];

const outDir = path.join("docs", "qa-fix", "screenshots", label);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const shot of SHOTS) {
    const url = new URL(shot.path, baseUrl).toString();
    await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
    await page.waitForTimeout(500);
    const file = path.join(outDir, `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: shot.fullPage });
    console.log(`${url} -> ${file}`);
  }
} finally {
  await browser.close();
}
