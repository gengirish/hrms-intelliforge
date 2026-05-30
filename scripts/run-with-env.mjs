#!/usr/bin/env node
/**
 * Tiny wrapper that loads .env.test (and .env.test.local override) into
 * process.env and then spawns a child command with the merged environment.
 *
 * Usage:
 *   node scripts/run-with-env.mjs <command> [args...]
 *
 * Equivalent to `dotenv-cli` but without the extra dependency.
 */
import { config as loadEnv } from "dotenv";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

for (const file of [".env.test", ".env.test.local"]) {
  const fullPath = resolve(repoRoot, file);
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true });
  }
}

const [, , cmd, ...args] = process.argv;
if (!cmd) {
  console.error(
    "Usage: node scripts/run-with-env.mjs <command> [args...]"
  );
  process.exit(2);
}

// On Windows, `npx`/`prisma` etc. are batch files and need shell:true to spawn.
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
