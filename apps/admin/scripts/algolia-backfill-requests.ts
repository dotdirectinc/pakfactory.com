/**
 * Backfill admin_requests from the admin request adapter (ADR-018).
 * HUMAN-RUN from apps/admin (uses ADMIN_DATA_SOURCE + allowlist / supabase):
 *   pnpm exec tsx scripts/algolia-backfill-requests.ts
 *
 * Production incremental sync should be a Supabase webhook / Edge Function
 * calling the same toAdminRequestAlgoliaRecord mapper — not this script.
 */
import { env } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";

import { getRequestReadAdapter } from "../src/lib/adapters";
import {
  ADMIN_REQUESTS_INDEX,
  toAdminRequestAlgoliaRecord,
} from "../src/lib/search/request-record";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const {
  ALGOLIA_APP_ID = "",
  ALGOLIA_WRITE_KEY = "",
  ADMIN_ALGOLIA_BACKFILL_OWNER_ID = "",
} = env;

async function main() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_KEY");
    process.exit(1);
  }
  const ownerId =
    ADMIN_ALGOLIA_BACKFILL_OWNER_ID ||
    env.ADMIN_DEV_BYPASS_ZOHO_USER_ID ||
    "";
  if (!ownerId) {
    console.error(
      "Set ADMIN_ALGOLIA_BACKFILL_OWNER_ID (or ADMIN_DEV_BYPASS_ZOHO_USER_ID) to the crm owner to index",
    );
    process.exit(1);
  }

  const summaries = await getRequestReadAdapter().listForSalesMember(ownerId);
  console.log(`Loaded ${summaries.length} requests for ${ownerId}`);

  const records = summaries.map((summary) =>
    toAdminRequestAlgoliaRecord({
      summary,
      assignedOwnerCrmId: ownerId,
    }),
  );

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);
  // Replace only this owner's objects: delete by filter then save.
  // Full clear would wipe other owners — never clearObjects on shared index.
  console.log(`Saving ${records.length} objects to ${ADMIN_REQUESTS_INDEX}...`);
  if (records.length > 0) {
    await client.saveObjects({
      indexName: ADMIN_REQUESTS_INDEX,
      objects: records,
    });
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
