#!/usr/bin/env node
/**
 * Prod-DB guard for E2E / integration tests.
 *
 * Loads `.env.test` (and `.env.test.local` if present), then refuses to
 * proceed if the resolved DATABASE_URL looks like the production database.
 *
 * Run via: `node scripts/check-e2e-db.mjs`
 *
 * Exits 0 if safe, exits 1 with a loud message otherwise. This script is
 * called as a pre-step from the `test:e2e*` npm scripts so a misconfigured
 * environment can never silently mutate production data.
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

// Load in priority order: .env.test.local overrides .env.test.
for (const file of [".env.test", ".env.test.local"]) {
  const fullPath = resolve(repoRoot, file);
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true });
  }
}

const url = process.env.DATABASE_URL || "";

if (!url) {
  console.error(
    "\n[check-e2e-db] DATABASE_URL is not set.\n" +
      "  Create .env.test (copy from .env.test.example) and set DATABASE_URL\n" +
      "  to a DEDICATED integration database before running E2E tests.\n"
  );
  process.exit(1);
}

// Hostnames / database names that match production. Add more here if your
// production setup uses different identifiers.
const PROD_MARKERS = [
  // Production Vercel / Neon project markers — keep this list narrow but
  // broad enough to catch obvious mistakes.
  "hrms.intelliforge.tech",
  "intelliforge.tech",
  // The production database name. Update if your prod DB has a different name.
  "hrms_prod",
  "intelliforge_prod",
];

const lowerUrl = url.toLowerCase();
const matched = PROD_MARKERS.find((m) => lowerUrl.includes(m.toLowerCase()));

if (matched) {
  console.error(
    "\n[check-e2e-db] REFUSING TO RUN E2E TESTS.\n" +
      `  DATABASE_URL contains a production marker: "${matched}".\n` +
      "  E2E tests must use a separate integration database.\n" +
      "  Edit .env.test to point at the integration DB.\n"
  );
  process.exit(1);
}

// Sanity: prefer the URL look like a Neon test branch. Don't fail on this,
// just print a one-line confirmation that helps the operator catch surprises.
const safeUrl = url.replace(/:[^:@/]+@/, ":***@");
console.log(`[check-e2e-db] OK — using ${safeUrl}`);
process.exit(0);
