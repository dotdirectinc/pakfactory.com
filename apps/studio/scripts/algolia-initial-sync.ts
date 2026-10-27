/**
 * Backfill the Algolia posts index from one Sanity dataset (PROD-1957, PROD-3202).
 * HUMAN-RUN. Reads published posts from `--dataset` and writes them to that dataset's
 * own index (`algoliaPostIndexName`): production → `posts`, development → `posts_development`.
 * Image URLs are built for the same dataset, so they point where the asset lives.
 *
 *   npx sanity exec scripts/algolia-initial-sync.ts --with-user-token -- --dataset development
 *   npx sanity exec scripts/algolia-initial-sync.ts --with-user-token -- --dataset development --confirm
 *   npx sanity exec scripts/algolia-initial-sync.ts --with-user-token -- --dataset production --confirm --yes-production
 *
 * Without --confirm it reads and reports, and writes nothing. With --confirm it clears the
 * index and re-uploads every record (records for deleted posts are dropped).
 *
 * @see https://www.sanity.io/docs/developer-guides/how-to-implement-front-end-search-with-sanity
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";
import { getCliClient } from "sanity/cli";
import {
  buildImageUrl,
  isImageAssetId,
  parseImageAssetId,
} from "@sanity/asset-utils";

import {
  ALGOLIA_DATASETS,
  ALGOLIA_INITIAL_SYNC_QUERY,
  algoliaPostIndexName,
  isAlgoliaDataset,
  toAlgoliaRecord,
  type AlgoliaPostSource,
} from "@pakfactory/sanity/algolia/post-record";

import { describeMode, parseScriptArgs } from "./lib/script-args.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local first — dotenv keeps the first value set, so .env.local wins
// over .env (Next.js convention; matches sanity.blueprint.ts).
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const USAGE =
  "Usage: npx sanity exec scripts/algolia-initial-sync.ts --with-user-token -- --dataset <production|development> [--confirm] [--yes-production]";

const args = parseScriptArgs({ usage: USAGE });
if (!isAlgoliaDataset(args.dataset)) {
  console.error(`\n✖ No Algolia index for dataset "${args.dataset}". Known: ${ALGOLIA_DATASETS.join(", ")}.\n`);
  process.exit(1);
}
const dataset = args.dataset;

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

// The dataset comes from --dataset, never from the CLI client's env-derived default.
const sanityClient = getCliClient({ dataset });
const projectId = sanityClient.config().projectId ?? "";

function resolveImageUrl(assetRef?: string | null): string | null {
  if (!assetRef || !isImageAssetId(assetRef) || !projectId) {
    return null;
  }
  const parts = parseImageAssetId(assetRef);
  return buildImageUrl({
    ...parts,
    projectId,
    dataset,
  });
}

async function initialSync() {
  const indexName = algoliaPostIndexName(dataset);
  console.log(`dataset=${dataset} index=${indexName} mode=${describeMode({ confirm: args.confirm, dataset })}`);

  const posts = await sanityClient.fetch<AlgoliaPostSource[]>(ALGOLIA_INITIAL_SYNC_QUERY);
  const algoliaDocuments = posts.map((post) => toAlgoliaRecord(post, resolveImageUrl));
  const withImage = algoliaDocuments.filter((r) => r.image).length;
  console.log(`Found ${posts.length} posts in ${dataset} (${withImage} with an image)`);
  if (algoliaDocuments[0]?.image) console.log(`  sample image: ${algoliaDocuments[0].image}`);

  if (algoliaDocuments.length === 0) {
    // Never clear an index on an empty read — that empties live search.
    console.log(`No posts found in ${dataset} — nothing written to "${indexName}".`);
    return;
  }
  if (!args.confirm) {
    console.log(`Dry run — "${indexName}" untouched. Re-run with --confirm to write.`);
    return;
  }
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing required environment variables:");
    console.error("- ALGOLIA_APP_ID:", ALGOLIA_APP_ID ? "✓" : "✗");
    console.error("- ALGOLIA_WRITE_KEY:", ALGOLIA_WRITE_KEY ? "✓" : "✗");
    process.exit(1);
  }

  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  console.log(`Clearing "${indexName}"...`);
  await algoliaClient.clearObjects({ indexName });
  console.log("Uploading documents...");
  await algoliaClient.saveObjects({ indexName, objects: algoliaDocuments, waitForTasks: true });
  console.log(`Initial sync completed — ${algoliaDocuments.length} documents in "${indexName}" (dataset=${dataset})`);
}

initialSync()
  .then(() => process.exit(0))
  .catch((error: { status?: number; message?: string }) => {
    // Never print the error object: algoliasearch embeds request headers, including the key.
    console.error(`Initial sync failed: ${error?.status ?? ""} ${error?.message ?? ""}`.trim());
    process.exit(1);
  });
