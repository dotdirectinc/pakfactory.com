#!/usr/bin/env node
/**
 * Restore a delta backup (NDJSON produced by backup-delta.mjs) into a target
 * dataset using createOrReplace mutations. Only the captured docs are touched —
 * everything else in the target is left untouched.
 *
 * Usage: node scripts/sanity/restore-delta.mjs [target] [file]
 *        node scripts/sanity/restore-delta.mjs development
 *        node scripts/sanity/restore-delta.mjs development backups/sanity-delta-*.ndjson
 *        Defaults: target=development
 *
 * Requires: SANITY_WRITE_TOKEN (Editor role or higher)
 *           Falls back to SANITY_AUTH_TOKEN (your local `sanity login` session)
 *           SANITY_BACKUP_TOKEN (Viewer) is NOT sufficient — mutations need write access.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BACKUP_DIR = join(ROOT, "backups");

config({ path: join(ROOT, ".env.local") });

const PROJECT_ID = "8293wrxp";
const API_VERSION = "2021-10-21";

// Mutations require write access — Viewer token is not enough
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ??
  process.env.SANITY_WRITE_TOKEN ??
  process.env.SANITY_AUTH_TOKEN ??
  "";

if (!TOKEN) {
  console.error(
    "❌  No write token found.\n" +
      "    Set SANITY_API_WRITE_TOKEN (Editor role) in your .env.local."
  );
  process.exit(1);
}

const targetArg = process.argv[2] || "development";
const fileArg = process.argv[3];

if (!["production", "development"].includes(targetArg)) {
  console.error("❌  Usage: node scripts/sanity/restore-delta.mjs [development|production] [file]");
  process.exit(1);
}

// Resolve backup file
let backupFile = fileArg;
if (!backupFile) {
  if (!existsSync(BACKUP_DIR)) {
    console.error("❌  No backups/ directory found. Run backup-delta.mjs first.");
    process.exit(1);
  }
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("sanity-delta-") && f.endsWith(".ndjson"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("❌  No delta backup files found in backups/. Run pnpm sanity:backup:delta first.");
    process.exit(1);
  }

  console.log("\nAvailable delta backups:\n");
  files.forEach((f, i) => console.log(`  [${i + 1}] ${f}`));
  console.log();

  const rl = createInterface({ input, output });
  const answer = await rl.question(`Select backup (1–${files.length}): `);
  rl.close();

  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= files.length) {
    console.error("❌  Invalid selection.");
    process.exit(1);
  }
  backupFile = join(BACKUP_DIR, files[idx]);
} else {
  if (!existsSync(backupFile)) backupFile = join(BACKUP_DIR, backupFile);
  if (!existsSync(backupFile)) {
    console.error(`❌  File not found: ${backupFile}`);
    process.exit(1);
  }
}

// Parse NDJSON
const lines = readFileSync(backupFile, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean);

let manifest;
try {
  manifest = JSON.parse(lines[0]);
} catch {
  console.error("❌  Could not parse backup file — is it a valid delta NDJSON?");
  process.exit(1);
}

if (!manifest._deltaManifest) {
  console.error(
    "❌  Not a delta backup file.\n" +
      "    Use pnpm sanity:restore:dev / pnpm sanity:restore:prod for full backups."
  );
  process.exit(1);
}

const docs = lines.slice(1).map((l) => JSON.parse(l));

console.log(`\n📋  Delta backup:`);
console.log(`    File      : ${backupFile}`);
console.log(`    Captured  : ${manifest.timestamp}`);
console.log(`    Source    : ${manifest.source}`);
console.log(`    Docs      : ${docs.length} (${manifest.missingCount} missing + ${manifest.modifiedCount} modified)`);
console.log(`    → Target  : ${targetArg}\n`);

if (docs.length === 0) {
  console.log("✅  Nothing to restore (empty delta).\n");
  process.exit(0);
}

if (targetArg === "production") {
  console.log("⚠️   You are about to apply changes directly to the PRODUCTION dataset.");
  const rl = createInterface({ input, output });
  const confirm = await rl.question('    Type "yes" to confirm: ');
  rl.close();
  if (confirm.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
  console.log();
}

// Apply mutations in batches of 100
const BATCH_SIZE = 100;
const mutateUrl = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${targetArg}`;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

let applied = 0;
for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  const batch = docs.slice(i, i + BATCH_SIZE);
  const mutations = batch.map((doc) => ({ createOrReplace: doc }));

  const res = await fetch(mutateUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ mutations }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`\n❌  Mutation failed at doc ${i + 1}: ${res.status} — ${text}`);
    console.error(`    ${applied} document(s) were applied before the failure.`);
    process.exit(1);
  }

  applied += batch.length;
  process.stdout.write(`\r    Applying … ${applied}/${docs.length}`);
}

console.log(`\n\n✅  Delta restore complete — ${applied} document(s) applied to ${targetArg}.\n`);
