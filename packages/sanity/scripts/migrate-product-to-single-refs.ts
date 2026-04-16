/**
 * One-off: drop legacy array fields; keep one landing page + one collection per product.
 * Copies collection ref from primaryProductCollection or first productCollections[] if primaryCollection is missing.
 *
 * Unsets: landingPages, additionalLandingPages, productCollections, primaryProductCollection
 *
 * Env: SANITY_API_WRITE_TOKEN + project/dataset (same as seed).
 * Run: npm run migrate:product-single-refs --workspace=@pakfactory/sanity
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

type Row = {
  _id: string;
  primaryCollection?: { _ref?: string };
  primaryProductCollection?: { _ref?: string };
  productCollections?: Array<{ _ref?: string }>;
};

function collectionRefFrom(doc: Row): string | undefined {
  return (
    doc.primaryCollection?._ref ||
    doc.primaryProductCollection?._ref ||
    doc.productCollections?.find((c) => c._ref)?._ref
  );
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

  const rows = await client.fetch<Row[]>(
    `*[_type == "product"]{_id, primaryCollection, primaryProductCollection, productCollections}`,
  );

  for (const row of rows) {
    const colRef = collectionRefFrom(row);
    let patch = client.patch(row._id).unset([
      "landingPages",
      "additionalLandingPages",
      "productCollections",
      "primaryProductCollection",
    ]);

    if (colRef && !row.primaryCollection?._ref) {
      patch = patch.set({
        primaryCollection: { _type: "reference", _ref: colRef },
      });
      console.log("Migrated", row._id, "— set primaryCollection from legacy field(s)");
    } else {
      console.log("Migrated", row._id, "— unset legacy fields only");
    }

    await patch.commit();
  }

  console.log("Done.", rows.length, "product document(s) patched.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
