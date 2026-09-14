/**
 * Configure admin_requests Algolia index (ADR-018).
 * HUMAN-RUN from apps/admin:
 *   pnpm exec tsx scripts/algolia-configure-requests.ts
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";

import {
  ADMIN_REQUESTS_INDEX,
  ADMIN_REQUESTS_SETTINGS,
} from "../src/lib/search/request-record";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

async function main() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);
  console.log(`Configuring ${ADMIN_REQUESTS_INDEX}...`);
  await client.setSettings({
    indexName: ADMIN_REQUESTS_INDEX,
    indexSettings: {
      searchableAttributes: [...ADMIN_REQUESTS_SETTINGS.searchableAttributes],
      attributesForFaceting: [...ADMIN_REQUESTS_SETTINGS.attributesForFaceting],
      customRanking: [...ADMIN_REQUESTS_SETTINGS.customRanking],
    },
  });
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
