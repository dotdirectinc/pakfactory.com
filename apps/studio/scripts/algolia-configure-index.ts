/**
 * Configure Algolia index settings for blog search (PROD-1957).
 * HUMAN-RUN before backfill: npx sanity exec scripts/algolia-configure-index.ts --with-user-token
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";

import {
  ALGOLIA_INDEX_NAME,
  ALGOLIA_INDEX_SETTINGS,
  ALGOLIA_REPLICA_SETTINGS,
} from "@pakfactory/sanity/algolia/post-record";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local first — dotenv keeps the first value set, so .env.local wins
// over .env (Next.js convention; matches sanity.blueprint.ts).
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

async function configureIndex() {
  console.log(`Configuring Algolia index "${ALGOLIA_INDEX_NAME}"...`);

  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }

  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  try {
    await algoliaClient.setSettings({
      indexName: ALGOLIA_INDEX_NAME,
      indexSettings: { ...ALGOLIA_INDEX_SETTINGS },
    });

    for (const [replicaName, settings] of Object.entries(ALGOLIA_REPLICA_SETTINGS)) {
      await algoliaClient.setSettings({
        indexName: replicaName,
        indexSettings: settings,
      });
      console.log(`Replica settings applied: ${replicaName}`);
    }

    console.log("Index settings applied successfully");
  } catch (error) {
    console.error("Error configuring Algolia index:", error);
    process.exit(1);
  }
}

configureIndex()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
