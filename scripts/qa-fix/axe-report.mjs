// Lists serious/critical axe-core violations (with colours and contrast
// ratios) for the public pages the QA a11y smoke test covers. Read-only.
//
//   node scripts/qa-fix/axe-report.mjs http://localhost:3011
//   node scripts/qa-fix/axe-report.mjs https://hrms.intelliforge.tech
//
// No output means no serious or critical violations.

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext(); const page = await ctx.newPage();
for (const p of ["/", "/pricing", "/internships", "/mentors"]) {
  await page.goto(base + p, { waitUntil: "networkidle", timeout: 240000 });
  const r = await new AxeBuilder({ page }).analyze();
  for (const v of r.violations.filter((v) => ["serious", "critical"].includes(v.impact))) {
    console.log(`\n${p} ${v.id} (${v.impact}) x${v.nodes.length}`);
    for (const n of v.nodes) {
      const d = n.any[0]?.data ?? {};
      console.log(`  ${n.target.join(" ")} | ${d.fgColor ?? ""} on ${d.bgColor ?? ""} ratio ${d.contrastRatio ?? ""} need ${d.expectedContrastRatio ?? ""} | ${n.html.slice(0, 90)}`);
    }
  }
}
await browser.close();
