/**
 * Initial Algolia backfill for published blog posts (PROD-1957).
 * HUMAN-RUN: npx sanity exec scripts/algolia-initial-sync.ts --with-user-token
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
  ALGOLIA_INDEX_NAME,
  ALGOLIA_INITIAL_SYNC_QUERY,
  toAlgoliaRecord,
  type AlgoliaPostSource,
} from "@pakfactory/sanity/algolia/post-record";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local first — dotenv keeps the first value set, so .env.local wins
// over .env (Next.js convention; matches sanity.blueprint.ts).
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

const sanityClient = getCliClient();
const projectId = sanityClient.config().projectId ?? "";
const dataset = sanityClient.config().dataset ?? "";

function resolveImageUrl(assetRef?: string | null): string | null {
  if (!assetRef || !isImageAssetId(assetRef) || !projectId || !dataset) {
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
  console.log("Starting initial sync to Algolia...");

  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing required environment variables:");
    console.error("- ALGOLIA_APP_ID:", ALGOLIA_APP_ID ? "✓" : "✗");
    console.error("- ALGOLIA_WRITE_KEY:", ALGOLIA_WRITE_KEY ? "✓" : "✗");
    process.exit(1);
  }

  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  try {
    const posts = await sanityClient.fetch<AlgoliaPostSource[]>(
      ALGOLIA_INITIAL_SYNC_QUERY,
    );

    console.log(`Found ${posts.length} posts to sync`);

    if (posts.length === 0) {
      console.log("No posts found to sync");
      return;
    }

    const algoliaDocuments = posts.map((post) =>
      toAlgoliaRecord(post, resolveImageUrl),
    );

    console.log("Clearing existing documents from Algolia index...");
    await algoliaClient.clearObjects({ indexName: ALGOLIA_INDEX_NAME });

    console.log("Uploading documents to Algolia...");
    await algoliaClient.saveObjects({
      indexName: ALGOLIA_INDEX_NAME,
      objects: algoliaDocuments,
    });

    console.log(
      `Initial sync completed — ${algoliaDocuments.length} documents in index "${ALGOLIA_INDEX_NAME}"`,
    );
  } catch (error) {
    console.error("Error during initial sync to Algolia:", error);
    process.exit(1);
  }
}

initialSync()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
