#!/usr/bin/env node
/**
 * Import a local .tar.gz backup into a Sanity dataset.
 * Usage: node scripts/sanity/restore.mjs [production|development] [path/to/backup.tar.gz]
 *
 * If no file is given, lists available backups in ./backups/ and prompts to choose.
 * Restoring to production requires an explicit confirmation prompt.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BACKUP_DIR = join(ROOT, "backups");
const PROJECT_ID = "8293wrxp";

const dataset = process.argv[2];
let backupFile = process.argv[3];

if (!dataset || !["production", "development"].includes(dataset)) {
  console.error(`❌  Usage: node scripts/sanity/restore.mjs [production|development] [file]`);
  process.exit(1);
}

// If no file provided, list available backups and let the user pick
if (!backupFile) {
  if (!existsSync(BACKUP_DIR)) {
    console.error(`❌  No backups directory found at ${BACKUP_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".tar.gz"))
    .sort()
    .reverse(); // newest first

  if (files.length === 0) {
    console.error(`❌  No backup files found in ${BACKUP_DIR}`);
    process.exit(1);
  }

  console.log("\n📂  Available backups (newest first):");
  files.forEach((f, i) => console.log(`    [${i + 1}] ${f}`));

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("\n    Enter number to restore: ");
  rl.close();

  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= files.length) {
    console.error("❌  Invalid selection.");
    process.exit(1);
  }
  backupFile = join(BACKUP_DIR, files[idx]);
}

backupFile = resolve(backupFile);
if (!existsSync(backupFile)) {
  console.error(`❌  File not found: ${backupFile}`);
  process.exit(1);
}

// Production gate — require explicit confirmation
if (dataset === "production") {
  console.log(`
⚠️   PRODUCTION RESTORE
    This will REPLACE the entire "${dataset}" dataset on project ${PROJECT_ID}
    with the contents of:
    ${backupFile}

    This action is IRREVERSIBLE. All current production data will be overwritten.
  `);
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('    Type "yes" to proceed: ');
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("⛔  Aborted.");
    process.exit(0);
  }
}

const token = process.env.SANITY_BACKUP_TOKEN ?? process.env.SANITY_AUTH_TOKEN ?? "";
const tokenFlag = token ? `--token "${token}"` : "";

console.log(`\n📥  Restoring to "${dataset}" dataset`);
console.log(`    Project : ${PROJECT_ID}`);
console.log(`    File    : ${backupFile}\n`);

try {
  execSync(
    `npx sanity@latest dataset import "${backupFile}" ${dataset} --replace -p ${PROJECT_ID} ${tokenFlag}`,
    { stdio: "inherit", cwd: ROOT }
  );
  console.log(`\n✅  Restore complete → ${dataset}`);
} catch {
  console.error("\n❌  Import failed.");
  process.exit(1);
}
