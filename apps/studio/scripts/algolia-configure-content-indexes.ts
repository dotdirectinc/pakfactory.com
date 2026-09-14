/**
 * Configure Algolia content_* indexes for admin search (ADR-018).
 * HUMAN-RUN: npx sanity exec scripts/algolia-configure-content-indexes.ts --with-user-token
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";

import {
  CONTENT_CASE_STUDIES_INDEX,
  CONTENT_CASE_STUDIES_SETTINGS,
  CONTENT_CUSTOMIZATIONS_INDEX,
  CONTENT_CUSTOMIZATIONS_SETTINGS,
  CONTENT_PRODUCTS_INDEX,
  CONTENT_PRODUCTS_SETTINGS,
} from "@pakfactory/sanity/algolia/content-indexes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

async function configure() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);
  const jobs = [
    { name: CONTENT_PRODUCTS_INDEX, settings: CONTENT_PRODUCTS_SETTINGS },
    {
      name: CONTENT_CUSTOMIZATIONS_INDEX,
      settings: CONTENT_CUSTOMIZATIONS_SETTINGS,
    },
    {
      name: CONTENT_CASE_STUDIES_INDEX,
      settings: CONTENT_CASE_STUDIES_SETTINGS,
    },
  ] as const;

  for (const job of jobs) {
    console.log(`Configuring "${job.name}"...`);
    await client.setSettings({
      indexName: job.name,
      indexSettings: { ...job.settings },
    });
    console.log(`Settings applied: ${job.name}`);
  }
}

configure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
