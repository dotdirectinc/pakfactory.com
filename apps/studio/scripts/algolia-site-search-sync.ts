/**
 * Configure + backfill the `site_search` Algolia index — the www ⌘K search (PROD-3109).
 *
 * Reads Sanity (read-only), writes ONLY to Algolia. Dry-run by default: it builds every
 * record and prints the counts per type and group, plus any row it would refuse.
 *
 *   pnpm --filter @pakfactory/studio run algolia:site-search -- --dataset development
 *   pnpm --filter @pakfactory/studio run algolia:site-search -- --dataset development --confirm
 *
 * With --confirm it (1) applies SITE_SEARCH_SETTINGS, then (2) replaces the index
 * contents atomically (`replaceAllObjects`: built in a temporary index, then moved over
 * `site_search`, so search never sees a half-filled index). Re-runnable; this is also
 * how parent status changes reach their children (see site-search.ts, "Known gaps").
 *
 * 🔴 ONE index, filled from ONE dataset. The `site-search-sync` Function is pinned to
 * the blueprint's dataset; backfill from the same one. A production fill is a
 * release-readiness decision (which index name staging and production each read) —
 * `--dataset production` also needs `--yes-production`.
 *
 * Env (repo-root .env.local): ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, and a Sanity read token
 * (SANITY_API_READ_TOKEN / SANITY_API_WRITE_TOKEN / SANITY_TOKEN).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";
import { algoliasearch, type IndexSettings } from "algoliasearch";
import dotenv from "dotenv";

import {
  SITE_SEARCH_BACKFILL_QUERY,
  SITE_SEARCH_INDEX,
  SITE_SEARCH_SETTINGS,
  siteSearchRecordProblem,
  type SiteSearchRecord,
} from "@pakfactory/sanity/algolia/site-search";

import { describeMode, parseScriptArgs } from "./lib/script-args.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run algolia:site-search -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which Sanity dataset to read. No env fallback.
  --confirm         Write settings + records to Algolia. Without it: dry run.
  --yes-production  Second gate; required with --dataset production --confirm.`;

const args = parseScriptArgs({ usage: USAGE }) as {
  dataset: string;
  confirm: boolean;
};

const PROJECT_ID =
  process.env.SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "8293wrxp";
const TOKEN =
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_TOKEN;
const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = process.env;

function tally(records: SiteSearchRecord[], key: "type" | "group") {
  const out: Record<string, number> = {};
  for (const record of records) out[record[key]] = (out[record[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  console.log(
    `site_search backfill — project=${PROJECT_ID} dataset=${args.dataset} index=${SITE_SEARCH_INDEX} mode=${describeMode(args)}`,
  );

  const sanity = createClient({
    projectId: PROJECT_ID,
    dataset: args.dataset,
    apiVersion: "2025-02-19",
    useCdn: false,
    perspective: "published",
    token: TOKEN,
  });

  const rows = await sanity.fetch<SiteSearchRecord[]>(SITE_SEARCH_BACKFILL_QUERY);
  const refused = rows
    .map((row) => ({ row, problem: siteSearchRecordProblem(row) }))
    .filter((entry) => entry.problem);
  const records = rows.filter((row) => !siteSearchRecordProblem(row));

  console.log(`\nRecords: ${records.length} (dataset=${args.dataset})`);
  console.table(tally(records, "group"));
  console.table(tally(records, "type"));
  for (const { row, problem } of refused) {
    console.warn(`  refused ${row?.objectID ?? "?"}: ${problem}`);
  }

  if (!args.confirm) {
    console.log(`\nDRY-RUN — nothing written to Algolia. Add --confirm to write ${records.length} records to ${SITE_SEARCH_INDEX}.`);
    return;
  }
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    throw new Error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
  }
  if (records.length === 0) {
    // Replacing with nothing would empty live search — almost always a wrong dataset or token.
    throw new Error(`0 records from dataset=${args.dataset} — refusing to empty ${SITE_SEARCH_INDEX}.`);
  }

  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);
  const settings = await algolia.setSettings({
    indexName: SITE_SEARCH_INDEX,
    // The constant is `as const` (readonly tuples); Algolia's type wants mutable arrays.
    indexSettings: SITE_SEARCH_SETTINGS as unknown as IndexSettings,
  });
  await algolia.waitForTask({ indexName: SITE_SEARCH_INDEX, taskID: settings.taskID });
  console.log(`Settings applied to ${SITE_SEARCH_INDEX}.`);

  await algolia.replaceAllObjects({ indexName: SITE_SEARCH_INDEX, objects: records });
  console.log(`✅ ${SITE_SEARCH_INDEX} now holds ${records.length} records from dataset=${args.dataset}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✖ Script failed:", error);
    process.exit(1);
  });
