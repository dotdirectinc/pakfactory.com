#!/usr/bin/env node
/**
 * Switch the active Sanity dataset across all app .env.local files.
 * Usage: node scripts/sanity/switch-dataset.mjs [development|production]
 *
 * Updates NEXT_PUBLIC_SANITY_DATASET and SANITY_STUDIO_DATASET in:
 *   apps/blog/.env.local
 *   apps/studio/.env.local
 *   apps/www/.env.local
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const dataset = process.argv[2];
if (!dataset || !["development", "production"].includes(dataset)) {
  console.error(`❌  Usage: node scripts/sanity/switch-dataset.mjs [development|production]`);
  process.exit(1);
}

if (dataset === "production") {
  console.log(`
⚠️   Switching to PRODUCTION dataset
    Your local Studio and apps will now read/write production data.
    Make sure you know what you're doing before publishing or deleting anything.
  `);
}

const DATASET_VARS = ["NEXT_PUBLIC_SANITY_DATASET", "SANITY_STUDIO_DATASET"];
const ENV_FILES = [
  join(ROOT, "apps/blog/.env.local"),
  join(ROOT, "apps/studio/.env.local"),
  join(ROOT, "apps/www/.env.local"),
];

let changed = 0;

for (const envFile of ENV_FILES) {
  if (!existsSync(envFile)) {
    console.log(`⚠️   Skipped (not found): ${envFile.replace(ROOT + "/", "")}`);
    continue;
  }

  let content = readFileSync(envFile, "utf8");
  let modified = false;

  for (const varName of DATASET_VARS) {
    // Match both quoted and unquoted values: VAR="value" or VAR=value
    const re = new RegExp(`^(${varName}=)("?)([^"\\n]*)("?)$`, "m");
    if (re.test(content)) {
      content = content.replace(re, `$1"${dataset}"`);
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(envFile, content, "utf8");
    console.log(`✅  Updated: ${envFile.replace(ROOT + "/", "")}`);
    changed++;
  } else {
    console.log(`ℹ️   No dataset vars found in: ${envFile.replace(ROOT + "/", "")}`);
  }
}

console.log(`\n🎯  Active dataset: ${dataset} (${changed} file${changed !== 1 ? "s" : ""} updated)`);
console.log("    Restart your dev server for the change to take effect.\n");
