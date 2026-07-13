#!/usr/bin/env node
/**
 * Export a Sanity dataset to a local .tar.gz backup.
 * Usage: node scripts/sanity/backup.mjs [production|development]
 * Output file path is printed as BACKUP_FILE=<path> for shell capture.
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

const dataset = process.argv[2] ?? "production";
if (!["production", "development"].includes(dataset)) {
  console.error(`❌  Invalid dataset "${dataset}". Use: production | development`);
  process.exit(1);
}

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  "-",
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds()),
].join("");
const outFile = join(BACKUP_DIR, `sanity-${dataset}-${stamp}.tar.gz`);

const token = process.env.SANITY_BACKUP_TOKEN ?? process.env.SANITY_AUTH_TOKEN ?? "";
const tokenFlag = token ? `--token "${token}"` : "";

console.log(`\n📦  Backing up Sanity "${dataset}" dataset`);
console.log(`    Project : ${PROJECT_ID}`);
console.log(`    Output  : ${outFile}\n`);

try {
  execSync(
    `npx sanity@latest dataset export ${dataset} "${outFile}" -p ${PROJECT_ID} ${tokenFlag}`,
    { stdio: "inherit", cwd: ROOT }
  );
  console.log(`\n✅  Backup saved: ${outFile}`);
  // Machine-readable output for shell capture: BACKUP_FILE=...
  process.stdout.write(`\nBACKUP_FILE=${outFile}\n`);
} catch {
  console.error("\n❌  Export failed.");
  process.exit(1);
}
