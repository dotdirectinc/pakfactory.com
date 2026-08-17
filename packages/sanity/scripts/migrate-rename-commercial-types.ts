/**
 * PROD-2304 (A9) — rename the commercial types, preserving document IDs.
 *
 * Seven type renames + three field-key renames. Every operation preserves the
 * document `_id`, so all references survive — GROQ `->` resolves by `_id` and
 * ignores `_type`, and the LIVE case-studies site dereferences these docs
 * (`caseStudy.capabilities[]->`, `caseStudy.products[]->`). Recreating under new
 * IDs would leave 29 published case studies with dangling references.
 *
 *   Type renames (in-place, _id preserved):
 *     capability           → customizationOption
 *     capabilityType       → customizationType
 *     capabilityCategory   → customizationCategory
 *     attribute            → propertyValue
 *     attributeGroup       → property
 *     productCategory      → productLine     (⚠ 29 case studies reference these)
 *     productStyleCategory → productStyle
 *
 *   Field-key renames (stored docs still carry the old key):
 *     product.primaryClassification        → kind        (product type unchanged)
 *     productStyle.productCategory (ref)   → productLine
 *     propertyValue.attributeGroup (ref)   → property
 *
 * Written by an agent, RUN BY A HUMAN — AGENTS.md § Sanity content: humans own
 * document writes (Studio UI, explicit seed runs, approved migrations, dataset
 * export/import). Do NOT run this from an agent.
 *
 * ── Before you run ────────────────────────────────────────────────────────────
 *   1. `sanity dataset export <dataset>` first — that is the restore point.
 *   2. Close every Studio tab (an open tab can re-save a doc under the old type).
 *   3. Deploy the renamed schema (this branch) BEFORE migrating prod, or the
 *      Studio will show the migrated docs as "unknown type" until it catches up.
 *
 * ── Running it ────────────────────────────────────────────────────────────────
 *   From the repo root:
 *     pnpm --filter @pakfactory/sanity migrate:rename-commercial --dataset development
 *   Dry run is the DEFAULT. Nothing is written until you add --confirm:
 *     ... --dataset development --confirm
 *   Production additionally demands --yes-production:
 *     ... --dataset production --confirm --yes-production
 *   Verify only (read-only), any time:
 *     ... --dataset production --verify
 *
 * Idempotent: re-running after a completed migration is a no-op (the old types
 * no longer exist). Operates on drafts (`drafts.<id>`) as well as published docs.
 *
 * Env: SANITY_API_WRITE_TOKEN (Editor). Project id from
 * NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID.
 */

import { createClient, type SanityClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

// ── Arguments ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name: string) => args.includes(`--${name}`);

const dataset = flag("dataset");
const confirm = has("confirm");
const verifyOnly = has("verify");
const yesProduction = has("yes-production");

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const token = process.env.SANITY_API_WRITE_TOKEN || "";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

// ── The rename map ────────────────────────────────────────────────────────────

/** old _type → new _type. Order: children before parents is irrelevant here
 *  because _id is preserved and refs resolve by _id regardless of _type. */
const TYPE_RENAMES: Record<string, string> = {
  capability: "customizationOption",
  capabilityType: "customizationType",
  capabilityCategory: "customizationCategory",
  attribute: "propertyValue",
  attributeGroup: "property",
  productCategory: "productLine",
  productStyleCategory: "productStyle",
};

/** Field-key renames to apply to the stored document, keyed by the OLD _type
 *  (or, for `product`, by its unchanged type). { oldKey: newKey }. */
const FIELD_RENAMES: Record<string, Record<string, string>> = {
  productStyleCategory: { productCategory: "productLine" },
  attribute: { attributeGroup: "property" },
  product: { primaryClassification: "kind" }, // product type is NOT renamed
};

// ── Guards ────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!dataset) fail("--dataset is required (e.g. --dataset development). Never inherited from env.");
if (!projectId) fail("No project id (NEXT_PUBLIC_SANITY_PROJECT_ID / SANITY_STUDIO_PROJECT_ID).");
if (!token) fail("No SANITY_API_WRITE_TOKEN (Editor token) in env.");
if (dataset === "production" && !verifyOnly && !yesProduction)
  fail("Refusing to write to production without --yes-production.");

const client: SanityClient = createClient({
  projectId,
  dataset: dataset!,
  apiVersion,
  token,
  useCdn: false,
});

const write = confirm && !verifyOnly;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Rename keys on a plain document object (shallow — these fields are top-level). */
function applyFieldRenames(
  doc: Record<string, unknown>,
  renames: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!renames) return doc;
  const out: Record<string, unknown> = { ...doc };
  for (const [oldKey, newKey] of Object.entries(renames)) {
    if (oldKey in out) {
      out[newKey] = out[oldKey];
      delete out[oldKey];
    }
  }
  return out;
}

async function count(type: string): Promise<number> {
  return client.fetch<number>(`count(*[_type == $t])`, { t: type });
}

// ── Migrate one type in place ───────────────────────────────────────────────────

async function migrateType(oldType: string, newType: string): Promise<number> {
  // Raw perspective: fetch published AND drafts.
  const docs = await client.fetch<Record<string, unknown>[]>(
    `*[_type == $t]`,
    { t: oldType },
    { perspective: "raw" },
  );
  if (docs.length === 0) {
    console.log(`  ${oldType} → ${newType}: 0 docs (already migrated or empty) — skip`);
    return 0;
  }

  console.log(`  ${oldType} → ${newType}: ${docs.length} docs`);
  if (!write) {
    for (const d of docs) console.log(`      would rewrite ${d._id as string}`);
    return docs.length;
  }

  // _type is immutable, so each doc is a delete + create of the SAME _id inside
  // ONE transaction (never two operations). Batch to keep transactions small.
  const BATCH = 50;
  for (let i = 0; i < docs.length; i += BATCH) {
    const tx = client.transaction();
    for (const doc of docs.slice(i, i + BATCH)) {
      const renamed = applyFieldRenames(doc, FIELD_RENAMES[oldType]);
      const next = { ...renamed, _type: newType };
      delete (next as Record<string, unknown>)._rev; // let the create assign a fresh rev
      tx.delete(doc._id as string).create(next as { _id: string; _type: string });
    }
    await tx.commit({ visibility: "async" });
    console.log(`      committed ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  return docs.length;
}

// ── Field-only migration for a type that is NOT being renamed (product) ─────────

async function migrateFieldsOnly(type: string, renames: Record<string, string>): Promise<number> {
  const docs = await client.fetch<Record<string, unknown>[]>(
    `*[_type == $t && (${Object.keys(renames).map((k) => `defined(${k})`).join(" || ")})]`,
    { t: type },
    { perspective: "raw" },
  );
  if (docs.length === 0) {
    console.log(`  ${type} field rename ${JSON.stringify(renames)}: 0 docs — skip`);
    return 0;
  }
  console.log(`  ${type} field rename ${JSON.stringify(renames)}: ${docs.length} docs`);
  if (!write) return docs.length;

  const BATCH = 50;
  for (let i = 0; i < docs.length; i += BATCH) {
    const tx = client.transaction();
    for (const doc of docs.slice(i, i + BATCH)) {
      const patch = client
        .patch(doc._id as string)
        .setIfMissing({}) // no-op guard
        .set(
          Object.fromEntries(
            Object.entries(renames)
              .filter(([oldKey]) => oldKey in doc)
              .map(([oldKey, newKey]) => [newKey, doc[oldKey]]),
          ),
        )
        .unset(Object.keys(renames).filter((k) => k in doc));
      tx.patch(patch);
    }
    await tx.commit({ visibility: "async" });
    console.log(`      committed ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  return docs.length;
}

// ── Verify (read-only) ──────────────────────────────────────────────────────────

async function verify(): Promise<void> {
  console.log(`\nVerification (read-only) on ${dataset}:`);
  let anyOld = false;
  for (const [oldType, newType] of Object.entries(TYPE_RENAMES)) {
    const [o, n] = [await count(oldType), await count(newType)];
    if (o > 0) anyOld = true;
    console.log(`  ${oldType}=${o}  →  ${newType}=${n}${o > 0 ? "   ⚠ old docs remain" : ""}`);
  }
  const csCustomizations = await client.fetch<number>(
    `count(*[_type == "caseStudy" && !(_id in path("drafts.**")) && count(capabilities[@->._id != null]) > 0])`,
  );
  const csProducts = await client.fetch<number>(
    `count(*[_type == "caseStudy" && !(_id in path("drafts.**")) && count(products[@->._id != null]) > 0])`,
  );
  console.log(`\n  Case studies with resolvable capabilities[]->: ${csCustomizations}`);
  console.log(`  Case studies with resolvable products[]->:     ${csProducts}`);
  const legacyProductKind = await count("product");
  const stillPrimaryClass = await client.fetch<number>(
    `count(*[_type == "product" && defined(primaryClassification)])`,
  );
  console.log(`  product docs=${legacyProductKind}, still carrying primaryClassification=${stillPrimaryClass} (want 0)`);
  console.log(anyOld ? "\n⚠ Migration incomplete — old types still present." : "\n✓ No old commercial types remain.");
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `PROD-2304 rename commercial types — project ${projectId}, dataset ${dataset}, mode ${
      verifyOnly ? "VERIFY" : write ? "WRITE" : "DRY-RUN"
    }`,
  );

  if (verifyOnly) {
    await verify();
    return;
  }

  console.log("\nType renames (in-place, _id preserved):");
  for (const [oldType, newType] of Object.entries(TYPE_RENAMES)) {
    await migrateType(oldType, newType);
  }

  console.log("\nField-only renames (type unchanged):");
  await migrateFieldsOnly("product", FIELD_RENAMES.product);

  if (!write) {
    console.log("\nDRY-RUN — nothing was written. Re-run with --confirm to apply.");
  } else {
    console.log("\n✓ Migration applied. Running verification…");
    await verify();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
