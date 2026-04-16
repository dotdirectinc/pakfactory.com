/**
 * One-off: `productPage.relatedCollections` from plain reference items to
 * `{ _type: "relatedCollectionItem", collection: reference, image? }`.
 *
 * Env: SANITY_API_WRITE_TOKEN + project/dataset (same as seed).
 * Run: npm run migrate:product-page-related-collections --workspace=@pakfactory/sanity
 */

import { createClient, type SanityClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token = process.env.SANITY_API_WRITE_TOKEN || "";

type UnknownRecord = Record<string, unknown>;

function isReferenceItem(item: unknown): item is UnknownRecord {
  if (!item || typeof item !== "object") return false;
  const o = item as UnknownRecord;
  return o._type === "reference" && typeof o._ref === "string";
}

function normalizeEntry(item: unknown, index: number): UnknownRecord {
  if (!item || typeof item !== "object") {
    return item as UnknownRecord;
  }
  const o = item as UnknownRecord;
  if (o._type === "relatedCollectionItem" && o.collection && typeof o.collection === "object") {
    return o;
  }
  if (isReferenceItem(o)) {
    const key =
      typeof o._key === "string" ? o._key : `mrel-${index}-${o._ref}`;
    return {
      _key: key,
      _type: "relatedCollectionItem",
      collection: { _type: "reference", _ref: o._ref },
    };
  }
  if (typeof o._ref === "string" && !o.collection) {
    const key =
      typeof o._key === "string" ? o._key : `mrel-${index}-${o._ref}`;
    return {
      _key: key,
      _type: "relatedCollectionItem",
      collection: { _type: "reference", _ref: o._ref },
    };
  }
  return o;
}

function needsMigration(items: unknown[] | undefined): boolean {
  if (!items?.length) return false;
  return items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const o = item as UnknownRecord;
    if (o._type === "relatedCollectionItem") return false;
    return isReferenceItem(o) || (typeof o._ref === "string" && !o.collection);
  });
}

async function migrate() {
  if (!projectId) {
    console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID");
    process.exit(1);
  }
  if (!token) {
    console.error("Missing SANITY_API_WRITE_TOKEN (Editor token with write access)");
    process.exit(1);
  }

  const client: SanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });

  const rows = await client.fetch<Array<{ _id: string; relatedCollections?: unknown[] }>>(
    `*[_type == "productPage" && defined(relatedCollections)]{_id, relatedCollections}`,
  );

  let updated = 0;
  for (const row of rows) {
    const list = row.relatedCollections;
    if (!Array.isArray(list) || !needsMigration(list)) continue;

    const next = list.map((item, i) => normalizeEntry(item, i));
    await client.patch(row._id).set({ relatedCollections: next }).commit();
    console.log("Migrated", row._id);
    updated += 1;
  }

  console.log(updated === 0 ? "No documents needed migration." : `Done. Patched ${updated} productPage(s).`);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
