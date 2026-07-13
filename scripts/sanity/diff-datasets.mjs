#!/usr/bin/env node
/**
 * Compare the production and development Sanity datasets.
 * Uses the Sanity HTTP API — no full export needed.
 *
 * Usage: node scripts/sanity/diff-datasets.mjs
 *
 * Shows:
 *   - Document counts per _type in each dataset
 *   - Documents present in prod but missing from dev
 *   - Documents present in dev but missing from prod
 *   - Documents where _updatedAt differs (likely content changes)
 */

const PROJECT_ID = "8293wrxp";
const API_VERSION = "2021-10-21";
const TOKEN = process.env.SANITY_BACKUP_TOKEN ?? process.env.SANITY_AUTH_TOKEN ?? "";

if (!TOKEN) {
  console.warn(
    "⚠️   No SANITY_BACKUP_TOKEN set — querying published documents only (no drafts).\n" +
      "    Set SANITY_BACKUP_TOKEN to include draft documents in the diff.\n"
  );
}

/** Run a GROQ query against a dataset and return the result array. */
async function query(dataset, groq) {
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sanity API error (${dataset}): ${res.status} — ${text}`);
  }
  const json = await res.json();
  return json.result ?? [];
}

console.log(`\n🔍  Comparing Sanity datasets (project: ${PROJECT_ID})\n`);

// Fetch _id, _type, _updatedAt for all non-system docs from both datasets
const FETCH_QUERY = `*[!(_id in path("_.**"))]{_id, _type, _updatedAt}`;

console.log("    Fetching production...");
const prodDocs = await query("production", FETCH_QUERY);
console.log("    Fetching development...");
const devDocs = await query("development", FETCH_QUERY);

// Index by _id
const prodMap = new Map(prodDocs.map((d) => [d._id, d]));
const devMap = new Map(devDocs.map((d) => [d._id, d]));

// --- Type counts ---
const countByType = (docs) =>
  docs.reduce((acc, d) => {
    acc[d._type] = (acc[d._type] ?? 0) + 1;
    return acc;
  }, {});

const prodCounts = countByType(prodDocs);
const devCounts = countByType(devDocs);
const allTypes = [...new Set([...Object.keys(prodCounts), ...Object.keys(devCounts)])].sort();

console.log(`\n${"─".repeat(64)}`);
console.log(`  Document counts by type`);
console.log(`${"─".repeat(64)}`);
console.log(`  ${"Type".padEnd(36)}  ${"Prod".padStart(6)}  ${"Dev".padStart(6)}`);
console.log(`  ${"─".repeat(36)}  ${"─".repeat(6)}  ${"─".repeat(6)}`);
for (const type of allTypes) {
  const p = prodCounts[type] ?? 0;
  const d = devCounts[type] ?? 0;
  const flag = p !== d ? " ◀" : "";
  console.log(`  ${type.padEnd(36)}  ${String(p).padStart(6)}  ${String(d).padStart(6)}${flag}`);
}
console.log(`  ${"─".repeat(36)}  ${"─".repeat(6)}  ${"─".repeat(6)}`);
console.log(
  `  ${"TOTAL".padEnd(36)}  ${String(prodDocs.length).padStart(6)}  ${String(devDocs.length).padStart(6)}`
);

// --- Missing in dev (in prod but not dev) ---
const missingInDev = prodDocs.filter((d) => !devMap.has(d._id));
// --- Missing in prod (in dev but not prod) ---
const missingInProd = devDocs.filter((d) => !prodMap.has(d._id));
// --- Modified: same _id but different _updatedAt ---
const modified = prodDocs.filter((d) => {
  const dev = devMap.get(d._id);
  return dev && dev._updatedAt !== d._updatedAt;
});

const printGroup = (label, docs, limit = 20) => {
  console.log(`\n${"─".repeat(64)}`);
  console.log(`  ${label} (${docs.length})`);
  console.log(`${"─".repeat(64)}`);
  if (docs.length === 0) {
    console.log("  (none)");
    return;
  }
  const show = docs.slice(0, limit);
  for (const d of show) {
    console.log(`  ${d._type.padEnd(28)} ${d._id}`);
  }
  if (docs.length > limit) {
    console.log(`  … and ${docs.length - limit} more`);
  }
};

printGroup("In PROD, missing from DEV", missingInDev);
printGroup("In DEV, missing from PROD", missingInProd);
printGroup("In both, but PROD is newer (_updatedAt differs)", modified);

console.log(`\n${"─".repeat(64)}`);
const inSync =
  missingInDev.length === 0 && missingInProd.length === 0 && modified.length === 0;
if (inSync) {
  console.log("  ✅  Datasets are in sync.\n");
} else {
  console.log(
    `  ⚠️   ${missingInDev.length} missing in dev · ${missingInProd.length} missing in prod · ${modified.length} modified\n` +
      "  Run `pnpm sanity:sync-prod-to-dev` to overwrite dev with prod.\n"
  );
}
