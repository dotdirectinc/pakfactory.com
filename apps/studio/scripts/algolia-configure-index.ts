/**
 * Configure the Algolia posts index + replicas for one Sanity dataset (PROD-1957, PROD-3202).
 * HUMAN-RUN before the backfill. Each dataset has its own index family
 * (`algoliaPostIndexName`): production → `posts`, development → `posts_development`.
 *
 *   npx sanity exec scripts/algolia-configure-index.ts -- --dataset development
 *   npx sanity exec scripts/algolia-configure-index.ts -- --dataset development --confirm
 *   npx sanity exec scripts/algolia-configure-index.ts -- --dataset production --confirm --yes-production
 *
 * Without --confirm it prints what it would set and writes nothing.
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";

import {
  ALGOLIA_DATASETS,
  algoliaIndexSettings,
  algoliaPostIndexName,
  algoliaReplicaSettings,
  isAlgoliaDataset,
} from "@pakfactory/sanity/algolia/post-record";

import { describeMode, parseScriptArgs } from "./lib/script-args.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local first — dotenv keeps the first value set, so .env.local wins
// over .env (Next.js convention; matches sanity.blueprint.ts).
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const USAGE =
  "Usage: npx sanity exec scripts/algolia-configure-index.ts -- --dataset <production|development> [--confirm] [--yes-production]";

const args = parseScriptArgs({ usage: USAGE });
if (!isAlgoliaDataset(args.dataset)) {
  console.error(`\n✖ No Algolia index for dataset "${args.dataset}". Known: ${ALGOLIA_DATASETS.join(", ")}.\n`);
  process.exit(1);
}
const dataset = args.dataset;

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

async function configureIndex() {
  const indexName = algoliaPostIndexName(dataset);
  const indexSettings = algoliaIndexSettings(dataset);
  const replicas = algoliaReplicaSettings(dataset);

  console.log(`dataset=${dataset} index=${indexName} mode=${describeMode({ confirm: args.confirm, dataset })}`);
  console.log(`  replicas: ${indexSettings.replicas.join(", ")}`);

  if (!args.confirm) {
    console.log("Dry run — nothing written. Re-run with --confirm to apply.");
    return;
  }
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }

  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  // Setting `replicas` on the primary creates the replica indexes; wait for that
  // task so a first run on a new dataset can then apply each replica's ranking.
  const { taskID } = await algoliaClient.setSettings({ indexName, indexSettings });
  await algoliaClient.waitForTask({ indexName, taskID });
  for (const [replicaName, settings] of Object.entries(replicas)) {
    await algoliaClient.setSettings({ indexName: replicaName, indexSettings: settings });
    console.log(`Replica settings applied: ${replicaName}`);
  }
  console.log(`Index settings applied to "${indexName}" (dataset=${dataset})`);
}

configureIndex()
  .then(() => process.exit(0))
  .catch((error: { status?: number; message?: string }) => {
    // Never print the error object: algoliasearch embeds request headers, including the key.
    console.error(`Error configuring Algolia index: ${error?.status ?? ""} ${error?.message ?? ""}`.trim());
    process.exit(1);
  });
