import { defineBlueprint, defineDocumentFunction } from "@sanity/blueprints";
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Load repo-root .env then .env.local (canonical env home — matches
// apps/studio/scripts/algolia-initial-sync.ts and next.config.ts loadEnvConfig).
// .env.local wins for keys present in both (dotenv keeps the first value set).
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

import { ALGOLIA_POST_PROJECTION } from "@pakfactory/sanity/algolia/post-record";

const { ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY } = process.env;

// Accept the repo's existing env names (root .env.example uses NEXT_PUBLIC_*;
// the studio uses SANITY_STUDIO_*) so no extra keys are needed.
const SANITY_PROJECT_ID =
  process.env.SANITY_PROJECT_ID ??
  process.env.SANITY_STUDIO_PROJECT_ID ??
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const SANITY_DATASET =
  process.env.SANITY_DATASET ??
  process.env.SANITY_STUDIO_DATASET ??
  process.env.NEXT_PUBLIC_SANITY_DATASET;

if (typeof ALGOLIA_APP_ID !== "string" || typeof ALGOLIA_WRITE_KEY !== "string") {
  throw new Error("ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY must be set");
}

if (typeof SANITY_PROJECT_ID !== "string" || typeof SANITY_DATASET !== "string") {
  throw new Error(
    "Sanity project/dataset not found — set SANITY_PROJECT_ID + SANITY_DATASET " +
      "(or the existing NEXT_PUBLIC_SANITY_* / SANITY_STUDIO_* vars) in root .env.local",
  );
}

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: "algolia-document-sync",
      memory: 1,
      timeout: 10,
      src: "./functions/algolia-document-sync",
      event: {
        on: ["create", "update", "delete"],
        filter: "_type == 'post' && defined(slug.current)",
        projection: ALGOLIA_POST_PROJECTION,
      },
      env: {
        COMMENT:
          "ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY env variables are required to sync documents to Algolia",
        ALGOLIA_APP_ID,
        ALGOLIA_WRITE_KEY,
        SANITY_PROJECT_ID,
        SANITY_DATASET,
      },
    }),
  ],
});
