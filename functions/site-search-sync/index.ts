import { env } from "node:process";

import { createClient } from "@sanity/client";
import { documentEventHandler } from "@sanity/functions";
import { algoliasearch } from "algoliasearch";

import {
  SITE_SEARCH_DOC_QUERY,
  SITE_SEARCH_INDEX,
  SITE_SEARCH_MAX_RECORD_BYTES,
} from "./query.generated";

/**
 * Keeps `site_search` (www ⌘K search, PROD-3109) in step with one changed document.
 *
 * The event projection carries only the id: the record — gates, link, image, tags — is
 * built by SITE_SEARCH_DOC_QUERY, which needs sub-queries a Function projection cannot
 * run. So the Function asks the Content Lake for the document's record:
 *   a record   → save it
 *   null       → the document is gone or no longer has a www page → remove it
 *
 * Source of the query: packages/sanity/src/algolia/site-search.ts (generated copy here).
 * Deploy: `pnpm dlx sanity blueprints deploy` — only after approval on PROD-3109.
 * Logs:   `pnpm dlx sanity functions logs site-search-sync`
 */

type EventDoc = { _id?: string; _type?: string; operation?: string };

type Row = {
  objectID?: string;
  type?: string;
  title?: string;
  href?: string;
};

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

function problem(row: Row): string | null {
  if (!row.objectID) return "no objectID";
  if (!row.type) return "unknown type";
  if (!row.title?.trim()) return "no title";
  if (!row.href) return "no link";
  const bytes = new TextEncoder().encode(JSON.stringify(row)).length;
  if (bytes > SITE_SEARCH_MAX_RECORD_BYTES) return `${bytes} bytes`;
  return null;
}

export const handler = documentEventHandler(async ({ context, event }) => {
  const data = event.data as EventDoc | null;
  const id = data?._id;
  if (!id || id.startsWith("drafts.") || id.startsWith("versions.")) return;

  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  const row =
    data.operation === "delete"
      ? null
      : await createClient({
          ...context.clientOptions,
          apiVersion: "2025-02-19",
          useCdn: false,
          perspective: "published",
        }).fetch<Row | null>(SITE_SEARCH_DOC_QUERY, { id });

  const reason = row ? problem(row) : null;
  if (!row || reason) {
    await algolia.deleteObject({ indexName: SITE_SEARCH_INDEX, objectID: id });
    console.log(
      `Removed ${id} (${data._type}) from ${SITE_SEARCH_INDEX}: ${reason ?? "no www page"}`,
    );
    return;
  }

  await algolia.addOrUpdateObject({
    indexName: SITE_SEARCH_INDEX,
    objectID: id,
    body: row,
  });
  console.log(`Synced ${id} → ${SITE_SEARCH_INDEX} (${row.type} "${row.title}")`);
});
