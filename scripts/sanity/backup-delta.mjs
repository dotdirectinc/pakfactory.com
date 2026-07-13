#!/usr/bin/env node
/**
 * Back up only the documents that differ between two datasets.
 * Fetches full content from SOURCE for docs that are missing in TARGET or
 * have a different _updatedAt. Writes a single NDJSON file with a manifest
 * header — ready for restore-delta.mjs.
 *
 * Usage: node scripts/sanity/backup-delta.mjs [source] [target]
 *        Defaults: source=production  target=development
 *
 * Output: backups/sanity-delta-<source>-to-<target>-YYYYMMDD-HHmmss.ndjson
 *
 * Requires: SANITY_BACKUP_TOKEN (Viewer role is sufficient — read only)
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BACKUP_DIR = join(ROOT, "backups");

config({ path: join(ROOT, ".env.local") });

const PROJECT_ID = "8293wrxp";
const API_VERSION = "2021-10-21";
const TOKEN = process.env.SANITY_BACKUP_TOKEN ?? process.env.SANITY_AUTH_TOKEN ?? "";

const source = process.argv[2] || "production";
const target = process.argv[3] || "development";

if (source === target) {
  console.error("❌  Source and target must be different datasets.");
  process.exit(1);
}
if (!TOKEN) {
  console.error("❌  No SANITY_BACKUP_TOKEN found. Set it in your environment.");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

async function groqQuery(dataset, query) {
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sanity API error (${dataset}): ${res.status} — ${text}`);
  }
  return (await res.json()).result ?? [];
}

async function fetchFullDocs(dataset, ids) {
  const BATCH = 100;
  const all = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const idList = batch.map((id) => `"${id}"`).join(",");
    const docs = await groqQuery(dataset, `*[_id in [${idList}]]`);
    all.push(...docs);
    process.stdout.write(`\r    Fetching docs … ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
  }
  console.log();
  return all;
}

console.log(`\n📊  Diffing  ${source}  vs  ${target}  (project: ${PROJECT_ID})\n`);

const INDEX_QUERY = `*[!(_id in path("_.**"))]{_id, _updatedAt}`;
console.log(`    Querying ${source} …`);
const sourceDocs = await groqQuery(source, INDEX_QUERY);
console.log(`    Querying ${target} …`);
const targetDocs = await groqQuery(target, INDEX_QUERY);

const targetMap = new Map(targetDocs.map((d) => [d._id, d]));

const missingIds = sourceDocs.filter((d) => !targetMap.has(d._id)).map((d) => d._id);
const modifiedIds = sourceDocs
  .filter((d) => {
    const t = targetMap.get(d._id);
    return t && t._updatedAt !== d._updatedAt;
  })
  .map((d) => d._id);

const toFetch = [...missingIds, ...modifiedIds];

console.log(`\n  Missing in ${target}           : ${missingIds.length}`);
console.log(`  Modified (${source} is newer) : ${modifiedIds.length}`);
console.log(`  Total to capture              : ${toFetch.length}`);

if (toFetch.length === 0) {
  console.log(`\n✅  Datasets are already in sync — nothing to back up.\n`);
  process.exit(0);
}

console.log(`\n📦  Fetching full document content from ${source} …`);
const fullDocs = await fetchFullDocs(source, toFetch);

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const outFile = join(BACKUP_DIR, `sanity-delta-${source}-to-${target}-${stamp}.ndjson`);

const manifest = {
  _deltaManifest: true,
  source,
  target,
  projectId: PROJECT_ID,
  timestamp: now.toISOString(),
  missingCount: missingIds.length,
  modifiedCount: modifiedIds.length,
  totalDocs: fullDocs.length,
};

const lines = [JSON.stringify(manifest), ...fullDocs.map((d) => JSON.stringify(d))];
writeFileSync(outFile, lines.join("\n") + "\n", "utf8");

console.log(`\n✅  Delta backup saved:`);
console.log(`    File : ${outFile}`);
console.log(`    Docs : ${fullDocs.length} (${missingIds.length} missing + ${modifiedIds.length} modified)\n`);
