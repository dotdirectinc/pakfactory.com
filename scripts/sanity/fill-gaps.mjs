#!/usr/bin/env node
/**
 * Fill the GAPS between the production and development Sanity datasets — both ways.
 *
 *   • In PROD but missing from DEV  → created in DEVELOPMENT
 *   • In DEV  but missing from PROD → created in PRODUCTION
 *
 * MISSING-ONLY and non-destructive: it uses `createIfNotExists`, so documents that
 * already exist in the target — including the "modified / prod is newer" set from
 * `pnpm sanity:diff` — are NEVER overwritten. To push content changes for docs that
 * exist on both sides, use the delta backup/restore scripts; this only closes the
 * presence gap.
 *
 * ── Reference-aware asset handling ──────────────────────────────────────────
 * A missing asset is only filled when one of the *documents being promoted* in the
 * same run actually references it. Missing assets referenced only by MODIFIED docs
 * (which exist on both sides and are left untouched) are SKIPPED — filling them
 * would just create an unreferenced orphan in the target. Those belong to a content
 * sync (delta restore), not a presence fill.
 *
 * ── Binaries are handled per-direction (deliberate asymmetry) ───────────────
 * DEV (prod → dev): asset docs are copied VERBATIM, preserving `_id`. They keep
 *   their source `url`/`path`, so images render from prod's public, stable CDN. Dev
 *   is a transient mirror re-synced from prod nightly, so no binary duplication is
 *   needed.
 * PROD (dev → prod): prod is the source of truth and dev is wiped nightly by
 *   `sync-prod-to-dev --replace`, so prod must OWN its binaries. Each referenced
 *   dev-only asset's binary is re-uploaded into prod (yielding a new, prod-resident,
 *   content-addressed id — the CDN bytes re-hash), and every promoted doc's `_ref`
 *   is rewritten from the old id to the new one before it is created.
 *
 * Promoted docs + their (verbatim or remapped) assets are written in ONE transaction
 * so strong references resolve atomically.
 *
 * Usage:
 *   node scripts/sanity/fill-gaps.mjs                # dry run — show the plan, write nothing
 *   node scripts/sanity/fill-gaps.mjs --apply-dev    # create prod-only docs into DEVELOPMENT
 *   node scripts/sanity/fill-gaps.mjs --apply-prod   # create dev-only docs into PRODUCTION (confirm)
 *   node scripts/sanity/fill-gaps.mjs --apply-all    # both directions
 *   node scripts/sanity/fill-gaps.mjs --apply-all --yes   # both, skip the prod confirm (CI)
 *
 * Requires:
 *   SANITY_API_WRITE_TOKEN (Editor role) — for --apply-* (mutations + uploads)
 *     falls back to SANITY_WRITE_TOKEN / SANITY_AUTH_TOKEN
 *   A read token (SANITY_BACKUP_TOKEN / SANITY_API_READ_TOKEN / the write token)
 *     is used to include drafts; without one only published docs are compared.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
config({ path: join(ROOT, ".env.local") });

const PROJECT_ID = "8293wrxp";
const API_VERSION = "2021-10-21";

const READ_TOKEN =
  process.env.SANITY_BACKUP_TOKEN ??
  process.env.SANITY_API_READ_TOKEN ??
  process.env.SANITY_API_WRITE_TOKEN ??
  process.env.SANITY_WRITE_TOKEN ??
  process.env.SANITY_AUTH_TOKEN ??
  "";

const WRITE_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ??
  process.env.SANITY_WRITE_TOKEN ??
  process.env.SANITY_AUTH_TOKEN ??
  "";

// ── Flags ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const applyDev = args.has("--apply-dev") || args.has("--apply-all");
const applyProd = args.has("--apply-prod") || args.has("--apply-all");
const skipConfirm = args.has("--yes");
const isDryRun = !applyDev && !applyProd;

const ASSET_TYPES = new Set(["sanity.imageAsset", "sanity.fileAsset"]);
const SYSTEM_STRIP = new Set(["_rev", "_updatedAt", "_createdAt"]);
const ASSET_META_FIELDS = ["altText", "title", "description", "label", "creditLine", "source"];

const readClient = (dataset) =>
  createClient({ projectId: PROJECT_ID, dataset, apiVersion: API_VERSION, useCdn: false, token: READ_TOKEN });
const writeClient = (dataset) =>
  createClient({ projectId: PROJECT_ID, dataset, apiVersion: API_VERSION, useCdn: false, token: WRITE_TOKEN });

const isAsset = (d) => ASSET_TYPES.has(d._type);
const stripSystem = (doc) =>
  Object.fromEntries(Object.entries(doc).filter(([k]) => !SYSTEM_STRIP.has(k)));

/** Collect every reference `_ref` string reachable within a document. */
function collectRefs(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => collectRefs(v, out));
  else if (value && typeof value === "object") {
    if (typeof value._ref === "string") out.add(value._ref);
    for (const k in value) if (k !== "_ref") collectRefs(value[k], out);
  }
  return out;
}

/** Deep-clone `value`, rewriting any reference `_ref` present in `remap`. */
function remapRefs(value, remap) {
  if (Array.isArray(value)) return value.map((v) => remapRefs(v, remap));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "_ref" && typeof v === "string" && remap[v] ? remap[v] : remapRefs(v, remap);
    }
    return out;
  }
  return value;
}

if (!READ_TOKEN) {
  console.warn(
    "⚠️   No read token set — comparing published documents only (drafts excluded).\n" +
      "    Set SANITY_BACKUP_TOKEN to include drafts.\n"
  );
}

// ── Step 1: index both datasets ──────────────────────────────────────────────
const INDEX_QUERY = `*[!(_id in path("_.**"))]{_id, _type}`;

console.log(`\n🔍  Diffing datasets for gaps (project: ${PROJECT_ID})\n`);
console.log("    Fetching production …");
const prodDocs = await readClient("production").fetch(INDEX_QUERY);
console.log("    Fetching development …");
const devDocs = await readClient("development").fetch(INDEX_QUERY);

const prodIds = new Set(prodDocs.map((d) => d._id));
const devIds = new Set(devDocs.map((d) => d._id));

const missingInDev = prodDocs.filter((d) => !devIds.has(d._id)); // prod → dev
const missingInProd = devDocs.filter((d) => !prodIds.has(d._id)); // dev → prod

/** Fetch full bodies from `source` for the given stub ids, batched. */
async function fetchFull(source, stubs) {
  const client = readClient(source);
  const ids = stubs.map((d) => d._id);
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    out.push(...(await client.fetch(`*[_id in $ids]`, { ids: batch })));
  }
  return out;
}

/**
 * Resolve a direction into concrete work:
 *   - full bodies of the promoted (non-asset) docs
 *   - the missing assets those docs reference  → to fill
 *   - the missing assets nobody promoted references → to skip
 */
async function analyze(source, stubs) {
  const otherStubs = stubs.filter((d) => !isAsset(d));
  const assetStubs = stubs.filter(isAsset);
  const others = await fetchFull(source, otherStubs);
  const referenced = new Set();
  for (const doc of others) collectRefs(doc, referenced);
  const fillAssetStubs = assetStubs.filter((a) => referenced.has(a._id));
  const skipAssetStubs = assetStubs.filter((a) => !referenced.has(a._id));
  return { others, fillAssetStubs, skipAssetStubs };
}

const planDev = await analyze("production", missingInDev);
const planProd = await analyze("development", missingInProd);

// ── Plan printout ────────────────────────────────────────────────────────────
const printPlan = (label, plan) => {
  const { others, fillAssetStubs, skipAssetStubs } = plan;
  console.log(`\n${"─".repeat(64)}`);
  console.log(
    `  ${label}\n  ${others.length} doc(s) + ${fillAssetStubs.length} referenced asset(s)` +
      `  (${skipAssetStubs.length} unreferenced asset(s) skipped)`
  );
  console.log(`${"─".repeat(64)}`);
  const rows = [...others, ...fillAssetStubs];
  if (rows.length === 0) console.log("  (nothing to fill)");
  const show = rows.slice(0, 40);
  for (const d of show) console.log(`  ${d._type.padEnd(28)} ${d._id}`);
  if (rows.length > show.length) console.log(`  … and ${rows.length - show.length} more`);
  if (skipAssetStubs.length) {
    console.log(`  ── skipped (referenced only by modified/absent docs — use a content sync):`);
    for (const a of skipAssetStubs.slice(0, 10)) console.log(`     ${a._id}`);
    if (skipAssetStubs.length > 10) console.log(`     … and ${skipAssetStubs.length - 10} more`);
  }
};

printPlan("In PROD, missing from DEV  → create in DEVELOPMENT", planDev);
printPlan("In DEV, missing from PROD  → create in PRODUCTION", planProd);

const devWork = planDev.others.length + planDev.fillAssetStubs.length;
const prodWork = planProd.others.length + planProd.fillAssetStubs.length;

if (devWork === 0 && prodWork === 0) {
  console.log(`\n✅  Nothing to fill — no promotable presence gaps.\n`);
  process.exit(0);
}

if (isDryRun) {
  console.log(`\n${"─".repeat(64)}`);
  console.log("  DRY RUN — nothing was written. Re-run with one of:");
  console.log("    --apply-dev   fill the DEVELOPMENT gaps (safe, non-prod)");
  console.log("    --apply-prod  fill the PRODUCTION gaps  (writes to prod — confirmation required)");
  console.log("    --apply-all   both directions");
  console.log(`${"─".repeat(64)}\n`);
  process.exit(0);
}

if ((applyDev || applyProd) && !WRITE_TOKEN) {
  console.error("\n❌  No write token found. Set SANITY_API_WRITE_TOKEN (Editor role) in .env.local.\n");
  process.exit(1);
}

// ── DEV direction (verbatim) ─────────────────────────────────────────────────
async function fillVerbatim(source, target, plan) {
  const { others, fillAssetStubs } = plan;
  if (others.length + fillAssetStubs.length === 0) return;
  console.log(`\n📥  Filling "${target}" verbatim — ${others.length} doc(s) + ${fillAssetStubs.length} asset(s)`);

  const assets = await fetchFull(source, fillAssetStubs);
  let tx = writeClient(target).transaction();
  for (const a of assets) tx = tx.createIfNotExists(stripSystem(a)); // assets first
  for (const doc of others) tx = tx.createIfNotExists(stripSystem(doc));

  try {
    await tx.commit({ visibility: "async" });
  } catch (err) {
    const detail = err?.response?.body?.error?.description ?? err?.message ?? String(err);
    console.error(`\n❌  Transaction into "${target}" failed — nothing applied (atomic).\n    ${detail}`);
    process.exitCode = 1;
    return;
  }
  console.log(`    ✅  ${target}: ${assets.length} asset(s) + ${others.length} doc(s) created-if-absent.`);
}

// ── PROD direction (prod-safe: re-upload binaries, remap refs) ───────────────
async function fillWithReupload(source, target, plan) {
  const { others, fillAssetStubs } = plan;
  if (others.length + fillAssetStubs.length === 0) return;
  console.log(`\n📥  Filling "${target}" (prod-safe) — re-uploading ${fillAssetStubs.length} binary(ies), then ${others.length} doc(s)`);

  const assets = await fetchFull(source, fillAssetStubs);
  const target_ = writeClient(target);
  const remap = {};
  const failed = [];

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const kind = a._type === "sanity.fileAsset" ? "file" : "image";
    try {
      if (!a.url) throw new Error("asset has no url");
      const res = await fetch(a.url);
      if (!res.ok) throw new Error(`CDN ${res.status}`);
      const up = await target_.assets.upload(kind, Buffer.from(await res.arrayBuffer()), {
        filename: a.originalFilename || undefined,
        contentType: a.mimeType || undefined,
      });
      remap[a._id] = up._id;
      const meta = {};
      for (const f of ASSET_META_FIELDS) if (a[f] != null) meta[f] = a[f];
      if (Object.keys(meta).length) await target_.patch(up._id).set(meta).commit();
    } catch (err) {
      failed.push(`${a._id} (${err.message})`);
    }
    process.stdout.write(`\r    Re-uploading assets … ${i + 1}/${assets.length}`);
  }
  if (assets.length) console.log();

  if (failed.length) {
    console.error(`\n❌  ${failed.length} asset(s) failed to re-upload — aborting before doc creation:`);
    for (const f of failed) console.error(`    ${f}`);
    process.exitCode = 1;
    return;
  }

  let tx = target_.transaction();
  for (const doc of others) tx = tx.createIfNotExists(remapRefs(stripSystem(doc), remap));

  try {
    await tx.commit({ visibility: "async" });
  } catch (err) {
    const detail = err?.response?.body?.error?.description ?? err?.message ?? String(err);
    console.error(`\n❌  Document transaction into "${target}" failed — no docs applied (atomic).`);
    console.error(`    (Re-uploaded assets remain and will be reused on re-run.)\n    ${detail}`);
    process.exitCode = 1;
    return;
  }
  console.log(`    ✅  ${target}: ${assets.length} asset(s) re-uploaded + ${others.length} doc(s) created (${Object.keys(remap).length} ref id(s) remapped).`);
}

async function confirmProd() {
  if (skipConfirm) return true;
  console.log(`\n⚠️   About to write ${prodWork} object(s) directly to the PRODUCTION dataset.`);
  console.log("    (createIfNotExists — existing prod docs are never modified.)");
  const rl = createInterface({ input, output });
  const answer = await rl.question('    Type "yes" to confirm: ');
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

// ── Execute ──────────────────────────────────────────────────────────────────
if (applyDev) {
  await fillVerbatim("production", "development", planDev);
}

if (applyProd) {
  if (prodWork === 0) {
    console.log(`\n(no prod gaps to fill)`);
  } else if (await confirmProd()) {
    await fillWithReupload("development", "production", planProd);
  } else {
    console.log("    Aborted — production left untouched.");
  }
}

console.log(`\n✅  Done. Re-run \`pnpm sanity:diff\` to confirm.\n`);
