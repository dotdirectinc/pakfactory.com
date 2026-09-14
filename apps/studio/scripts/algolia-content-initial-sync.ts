/**
 * Initial Algolia backfill for content_* indexes (ADR-018).
 * HUMAN-RUN after configure:
 *   npx sanity exec scripts/algolia-content-initial-sync.ts --with-user-token
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";
import { getCliClient } from "sanity/cli";

import {
  CONTENT_CASE_STUDIES_INDEX,
  CONTENT_CASE_STUDIES_SYNC_QUERY,
  CONTENT_CUSTOMIZATIONS_INDEX,
  CONTENT_CUSTOMIZATIONS_SYNC_QUERY,
  CONTENT_PRODUCTS_INDEX,
  CONTENT_PRODUCTS_SYNC_QUERY,
  toAlgoliaContentRecord,
  type AlgoliaContentSource,
} from "@pakfactory/sanity/algolia/content-indexes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

const sanityClient = getCliClient();

async function syncIndex(
  indexName: string,
  query: string,
  label: string,
): Promise<void> {
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);
  const docs = await sanityClient.fetch<AlgoliaContentSource[]>(query);
  console.log(`${label}: found ${docs.length}`);
  if (docs.length === 0) return;

  const records = docs.map(toAlgoliaContentRecord);
  console.log(`Clearing ${indexName}...`);
  await client.clearObjects({ indexName });
  await client.saveObjects({ indexName, objects: records });
  console.log(`Saved ${records.length} → ${indexName}`);
}

async function main() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }

  await syncIndex(
    CONTENT_PRODUCTS_INDEX,
    CONTENT_PRODUCTS_SYNC_QUERY,
    "Products",
  );
  await syncIndex(
    CONTENT_CUSTOMIZATIONS_INDEX,
    CONTENT_CUSTOMIZATIONS_SYNC_QUERY,
    "Customizations",
  );
  await syncIndex(
    CONTENT_CASE_STUDIES_INDEX,
    CONTENT_CASE_STUDIES_SYNC_QUERY,
    "Case studies",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
