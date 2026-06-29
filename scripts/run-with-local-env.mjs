#!/usr/bin/env node
/**
 * Load .env then .env.local (Next.js convention) and spawn a child command.
 *
 * Usage:
 *   node scripts/run-with-local-env.mjs <command> [args...]
 *
 * Example:
 *   node scripts/run-with-local-env.mjs npx prisma migrate deploy
 */
import { config as loadEnv } from "dotenv";
import { spawn } from "node:child_process";
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

if (!process.env.DATABASE_URL) {
  console.error(
    "\n[run-with-local-env] DATABASE_URL is not set.\n" +
      "  Add it to .env.local (see .env.example), then retry.\n"
  );
  process.exit(1);
}

const [, , cmd, ...args] = process.argv;
if (!cmd) {
  console.error(
    "Usage: node scripts/run-with-local-env.mjs <command> [args...]"
  );
  process.exit(2);
}

const child = spawn(cmd, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
  cwd: repoRoot,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
