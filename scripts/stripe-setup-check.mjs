#!/usr/bin/env node
/**
 * Dry-run validator for Stripe billing env vars.
 * Loads `.env` and `.env.local` (if present). Does not log secret values.
 *
 * Run: npm run stripe:check
 * Exit 0 = ready; exit 1 = missing or invalid configuration.
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

for (const file of [".env", ".env.local"]) {
  const fullPath = resolve(repoRoot, file);
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true });
  }
}

const REQUIRED = [
  {
    key: "STRIPE_SECRET_KEY",
    test: (v) => /^sk_(test|live)_[A-Za-z0-9]+$/.test(v),
    hint: "sk_test_... or sk_live_... from Stripe Dashboard → API keys",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    test: (v) => /^whsec_[A-Za-z0-9]+$/.test(v),
    hint: "whsec_... from webhook endpoint or `stripe listen`",
  },
  {
    key: "STRIPE_STARTER_PRICE_ID",
    test: (v) => /^price_[A-Za-z0-9]+$/.test(v),
    hint: "Starter ($29/mo) recurring price ID",
  },
  {
    key: "STRIPE_GROWTH_PRICE_ID",
    test: (v) => /^price_[A-Za-z0-9]+$/.test(v),
    hint: "Growth ($79/mo) recurring price ID",
  },
  {
    key: "STRIPE_ENTERPRISE_PRICE_ID",
    test: (v) => /^price_[A-Za-z0-9]+$/.test(v),
    hint: "Enterprise recurring price ID",
  },
];

const OPTIONAL = [
  {
    key: "NEXT_PUBLIC_APP_URL",
    test: (v) => /^https?:\/\/.+/.test(v),
    hint: "Used for checkout success/cancel URLs (e.g. https://hrms.intelliforge.tech)",
  },
];

function mask(value) {
  if (!value || value.length < 8) return "(set, too short to mask)";
  return `${value.slice(0, 7)}…${value.slice(-4)} (${value.length} chars)`;
}

let errors = 0;
let warnings = 0;

console.log("[stripe-setup-check] Validating Stripe billing configuration…\n");

for (const { key, test, hint } of REQUIRED) {
  const value = (process.env[key] || "").trim();
  if (!value) {
    console.error(`  ✗ ${key} — not set`);
    console.error(`      ${hint}`);
    errors++;
    continue;
  }
  if (!test(value)) {
    console.error(`  ✗ ${key} — invalid format (${mask(value)})`);
    console.error(`      ${hint}`);
    errors++;
    continue;
  }
  console.log(`  ✓ ${key} — ${mask(value)}`);
}

for (const { key, test, hint } of OPTIONAL) {
  const value = (process.env[key] || "").trim();
  if (!value) {
    console.warn(`  ⚠ ${key} — not set (defaults to http://localhost:3000 in checkout)`);
    warnings++;
    continue;
  }
  if (!test(value)) {
    console.warn(`  ⚠ ${key} — unexpected format (${mask(value)})`);
    console.warn(`      ${hint}`);
    warnings++;
    continue;
  }
  console.log(`  ✓ ${key} — ${value}`);
}

const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
const isTestKey = secretKey.startsWith("sk_test_");
const isLiveKey = secretKey.startsWith("sk_live_");

if (isTestKey) {
  console.log("\n  Mode: TEST (sk_test_) — use test price IDs and test webhook secret");
} else if (isLiveKey) {
  console.log("\n  Mode: LIVE (sk_live_) — ensure price IDs and webhook secret are from Live mode");
}

if (errors > 0) {
  console.error(
    `\n[stripe-setup-check] FAILED — ${errors} required variable(s) missing or invalid.`,
  );
  console.error("  See docs/STRIPE_SETUP.md and .env.example\n");
  process.exit(1);
}

console.log(
  `\n[stripe-setup-check] OK — billing env looks ready${warnings ? ` (${warnings} warning(s))` : ""}.`,
);
console.log("  Next: create webhook endpoint and run a test checkout (docs/STRIPE_SETUP.md §6)\n");
process.exit(0);
