#!/usr/bin/env node
/**
 * Back up the production dataset and import it into development.
 * Used by: `pnpm sanity:sync-prod-to-dev` and the nightly GitHub Actions workflow.
 *
 * Usage: node scripts/sanity/sync-prod-to-dev.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BACKUP_DIR = join(ROOT, "backups");
const PROJECT_ID = "8293wrxp";

const token = process.env.SANITY_BACKUP_TOKEN ?? process.env.SANITY_AUTH_TOKEN ?? "";
const tokenFlag = token ? `--token "${token}"` : "";

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

// Build timestamped filename
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const backupFile = join(BACKUP_DIR, `sanity-production-${stamp}.tar.gz`);

// ── Step 1: Export production ────────────────────────────────────────────────
console.log(`\n📦  Step 1/2 — Exporting "production" dataset`);
console.log(`    Project : ${PROJECT_ID}`);
console.log(`    Output  : ${backupFile}\n`);

try {
  execSync(
    `npx sanity@latest dataset export production "${backupFile}" -p ${PROJECT_ID} ${tokenFlag}`,
    { stdio: "inherit", cwd: ROOT }
  );
} catch {
  console.error("\n❌  Export failed. Aborting sync.");
  process.exit(1);
}

// ── Step 2: Import into development ─────────────────────────────────────────
console.log(`\n📥  Step 2/2 — Importing into "development" dataset (--replace)\n`);

try {
  execSync(
    `npx sanity@latest dataset import "${backupFile}" development --replace -p ${PROJECT_ID} ${tokenFlag}`,
    { stdio: "inherit", cwd: ROOT }
  );
} catch {
  console.error("\n❌  Import into development failed.");
  process.exit(1);
}

console.log(`\n✅  Sync complete — development now mirrors production.`);
console.log(`    Backup kept at: ${backupFile}\n`);

// Emit for CI parsing
process.stdout.write(`BACKUP_FILE=${backupFile}\n`);
