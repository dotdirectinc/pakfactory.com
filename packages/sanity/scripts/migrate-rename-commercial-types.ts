/**
 * PROD-2304 (A9) — rename the commercial types.
 *
 * Seven type renames + three field-key renames.
 *
 *   Type renames:
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
 * ── Why NOT "preserve the _id" ──────────────────────────────────────────────────
 * Sanity's `_type` is IMMUTABLE — it cannot be changed on an existing document,
 * not even via delete+create of the same _id in one transaction (the Content Lake
 * rejects it: cannotModifyImmutableAttributeError). A referenced document also
 * cannot simply be deleted. So a type change is necessarily:
 *
 *     1. CREATE a new document (new _id, new _type, field-keys renamed,
 *        its own internal references remapped to the other new ids)
 *     2. REPOINT every external reference (case studies, products, solutions, …)
 *        from the old _id to the new _id
 *     3. DELETE the old document (now unreferenced)
 *
 * GROQ `->` resolves by _id, so once step 2 repoints `caseStudy.capabilities[]->`
 * and `caseStudy.products[]->`, the LIVE case-studies page keeps rendering the
 * same chips against the new docs. The RELATIONSHIP is preserved; the _id is not
 * (it cannot be). New ids are deterministic (`<oldId>-r2304`) so the run is
 * idempotent and re-runnable.
 *
 * Written by an agent, RUN BY A HUMAN — AGENTS.md § Sanity content. Do NOT run
 * this from an agent.
 *
 * ── Before you run ────────────────────────────────────────────────────────────
 *   1. `sanity dataset export <dataset>` first — that is the restore point.
 *   2. Close every Studio tab (an open tab can re-save an old-type doc).
 *   3. Deploy the renamed schema (this branch) before migrating, so the new docs
 *      render as known types in Studio.
 *
 * ── Running it ────────────────────────────────────────────────────────────────
 *   pnpm --filter @pakfactory/sanity migrate:rename-commercial --dataset development
 *   Dry run is the DEFAULT. Add --confirm to write. Prod needs --yes-production:
 *     ... --dataset production --confirm --yes-production
 *   Verify only (read-only): ... --dataset production --verify
 *
 * Idempotent: re-running after completion is a no-op (old types are gone; new
 * ids already exist). Operates on drafts (`drafts.<id>`) as well as published.
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

/** Suffix that turns an old _id into its new one. Deterministic → idempotent. */
const ID_SUFFIX = "-r2304";

// ── The rename map ────────────────────────────────────────────────────────────

const TYPE_RENAMES: Record<string, string> = {
  capability: "customizationOption",
  capabilityType: "customizationType",
  capabilityCategory: "customizationCategory",
  attribute: "propertyValue",
  attributeGroup: "property",
  productCategory: "productLine",
  productStyleCategory: "productStyle",
};
const OLD_TYPES = Object.keys(TYPE_RENAMES);

/** Field-key renames keyed by the OLD _type. { oldKey: newKey } (top-level). */
const FIELD_RENAMES: Record<string, Record<string, string>> = {
  productStyleCategory: { productCategory: "productLine" },
  attribute: { attributeGroup: "property" },
  // product is NOT type-renamed — handled as a separate field-only patch.
};

// ── Guards ────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}
if (!dataset) fail("--dataset is required (never inherited from env).");
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

type Doc = Record<string, unknown> & { _id: string; _type: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

/** old _id → new _id, preserving the drafts. prefix. */
function newIdOf(oldId: string): string {
  return oldId.startsWith("drafts.")
    ? `drafts.${oldId.slice("drafts.".length)}${ID_SUFFIX}`
    : `${oldId}${ID_SUFFIX}`;
}

/** Recursively rewrite every { _ref } whose target is in idMap. */
function remapRefs(value: unknown, idMap: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => remapRefs(v, idMap));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = k === "_ref" && typeof v === "string" && idMap.has(v) ? idMap.get(v)! : remapRefs(v, idMap);
    }
    return out;
  }
  return value;
}

function applyFieldRenames(doc: Record<string, unknown>, renames?: Record<string, string>): Record<string, unknown> {
  if (!renames) return doc;
  const out = { ...doc };
  for (const [oldKey, newKey] of Object.entries(renames)) {
    if (oldKey in out) {
      out[newKey] = out[oldKey];
      delete out[oldKey];
    }
  }
  return out;
}

/** Strip system-managed fields so create/createOrReplace is accepted. */
function stripSystem(doc: Record<string, unknown>): Record<string, unknown> {
  const { _rev, _createdAt, _updatedAt, ...rest } = doc;
  void _rev;
  void _createdAt;
  void _updatedAt;
  return rest;
}

const count = (type: string) => client.fetch<number>(`count(*[_type == $t])`, { t: type });

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
  const stillPrimaryClass = await client.fetch<number>(
    `count(*[_type == "product" && defined(primaryClassification)])`,
  );
  console.log(`\n  Case studies with resolvable capabilities[]->: ${csCustomizations}`);
  console.log(`  Case studies with resolvable products[]->:     ${csProducts}`);
  console.log(`  products still carrying primaryClassification:  ${stillPrimaryClass} (want 0)`);
  console.log(anyOld ? "\n⚠ Migration incomplete — old types still present." : "\n✓ No old commercial types remain.");
}

// ── Main migration ──────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `PROD-2304 rename commercial types — project ${projectId}, dataset ${dataset}, mode ${
      verifyOnly ? "VERIFY" : write ? "WRITE" : "DRY-RUN"
    }`,
  );
  if (verifyOnly) return verify();

  // 1. Collect every old-type doc (published + drafts) and build the id map.
  const oldDocs = await client.fetch<Doc[]>(`*[_type in $t]`, { t: OLD_TYPES }, { perspective: "raw" });
  const idMap = new Map<string, string>();
  for (const d of oldDocs) idMap.set(d._id, newIdOf(d._id));

  console.log(`\nFound ${oldDocs.length} docs across ${OLD_TYPES.length} old types.`);
  if (oldDocs.length === 0) {
    console.log("Nothing to migrate (already done?). Running verify…");
    return verify();
  }
  const byType = new Map<string, number>();
  for (const d of oldDocs) byType.set(d._type, (byType.get(d._type) ?? 0) + 1);
  for (const [t, n] of byType) console.log(`  ${t} → ${TYPE_RENAMES[t]}: ${n}`);

  // 2. External docs (not being renamed) that reference any old id → repoint.
  const oldIds = [...idMap.keys()];
  const externalRefs = await client.fetch<Doc[]>(
    `*[references($ids) && !(_type in $t)]`,
    { ids: oldIds, t: OLD_TYPES },
    { perspective: "raw" },
  );
  console.log(`  external referencing docs to repoint: ${externalRefs.length}`);

  if (!write) {
    console.log("\nDRY-RUN — nothing written. Re-run with --confirm to apply.");
    console.log("Plan: create new docs, repoint refs (incl. case studies), delete old, patch product.kind.");
    return;
  }

  // 3. CREATE new docs — new _id/_type, field-keys renamed, internal refs remapped.
  //    Strong references are validated at END-OF-TRANSACTION, and the new docs
  //    reference each other (e.g. customizationOption -> customizationCategory),
  //    so ALL creates must land in ONE transaction or a forward ref points at a
  //    not-yet-created target (documentReferenceDoesNotExistError).
  console.log(`\nStep 1/4 — create ${oldDocs.length} new documents (single transaction)…`);
  {
    const tx = client.transaction();
    for (const doc of oldDocs) {
      const remapped = remapRefs(doc, idMap) as Record<string, unknown>;
      const renamed = applyFieldRenames(remapped, FIELD_RENAMES[doc._type]);
      const next = stripSystem(renamed);
      next._id = idMap.get(doc._id)!;
      next._type = TYPE_RENAMES[doc._type];
      tx.createOrReplace(next as Doc);
    }
    await tx.commit({ visibility: "async" });
    console.log(`    created ${oldDocs.length}`);
  }

  // 4. REPOINT external references (case studies, products, solutions, …).
  console.log("Step 2/4 — repoint external references…");
  for (let i = 0; i < externalRefs.length; i += 50) {
    const tx = client.transaction();
    for (const doc of externalRefs.slice(i, i + 50)) {
      const remapped = stripSystem(remapRefs(doc, idMap) as Record<string, unknown>);
      tx.createOrReplace(remapped as Doc); // same _id/_type — allowed
    }
    await tx.commit({ visibility: "async" });
    console.log(`    repointed ${Math.min(i + 50, externalRefs.length)}/${externalRefs.length}`);
  }

  // 5. DELETE old docs. The old docs still reference EACH OTHER (old->old), so a
  //    piecemeal delete would dangle a surviving old doc's ref mid-way. Delete
  //    them ALL in one transaction — at end-of-transaction none remain, so no
  //    reference is left dangling. (External refs already repointed in step 2.)
  console.log(`Step 3/4 — delete ${oldDocs.length} old documents (single transaction)…`);
  {
    const tx = client.transaction();
    for (const doc of oldDocs) tx.delete(doc._id);
    await tx.commit({ visibility: "async" });
    console.log(`    deleted ${oldDocs.length}`);
  }

  // 6. product.primaryClassification → kind (product type unchanged).
  console.log("Step 4/4 — patch product.primaryClassification → kind…");
  const products = await client.fetch<Doc[]>(
    `*[_type == "product" && defined(primaryClassification)]`,
    {},
    { perspective: "raw" },
  );
  for (let i = 0; i < products.length; i += 50) {
    const tx = client.transaction();
    for (const p of products.slice(i, i + 50)) {
      tx.patch(client.patch(p._id).set({ kind: p.primaryClassification }).unset(["primaryClassification"]));
    }
    await tx.commit({ visibility: "async" });
  }
  console.log(`    patched ${products.length} product docs`);

  console.log("\n✓ Migration applied. Verifying…");
  await verify();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
