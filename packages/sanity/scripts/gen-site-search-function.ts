/**
 * Writes functions/site-search-sync/query.generated.ts — the Function bundle's copy of
 * the `site_search` query (PROD-3109). The Function cannot import this package, so it
 * carries the composed GROQ string instead; site-search.test.ts fails when the copy is
 * stale.
 *
 *   pnpm --filter @pakfactory/sanity run gen:site-search-fn
 *
 * Writes one file in git. Touches no dataset and no index.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  SITE_SEARCH_DOC_QUERY,
  SITE_SEARCH_INDEX,
  SITE_SEARCH_MAX_RECORD_BYTES,
} from "../src/algolia/site-search.ts";

const target = fileURLToPath(
  new URL("../../../functions/site-search-sync/query.generated.ts", import.meta.url),
);

const body = `// GENERATED — do not edit. Source: packages/sanity/src/algolia/site-search.ts
// Regenerate: pnpm --filter @pakfactory/sanity run gen:site-search-fn

export const SITE_SEARCH_INDEX = ${JSON.stringify(SITE_SEARCH_INDEX)};

export const SITE_SEARCH_MAX_RECORD_BYTES = ${SITE_SEARCH_MAX_RECORD_BYTES};

export const SITE_SEARCH_DOC_QUERY = ${JSON.stringify(SITE_SEARCH_DOC_QUERY)};
`;

writeFileSync(target, body);
console.log(`Wrote ${target}`);
