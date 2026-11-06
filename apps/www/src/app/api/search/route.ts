import { after, NextResponse } from "next/server";
import { SITE_SEARCH_INDEX } from "@pakfactory/sanity/algolia/site-search";

import { clientIpFrom } from "@/lib/request-ip";
import { getSearchClient } from "@/lib/search/algolia";
import { searchGate } from "@/lib/search/search-budget";
import {
  emptyResponse,
  HIGHLIGHT_ATTRIBUTES,
  HITS_PER_PAGE,
  MIN_QUERY_LENGTH,
  normalizeQuery,
  effectiveMatch,
  parseMatch,
  parseScope,
  parseTypeFilter,
  PRECONFIGURED_ATTRIBUTE,
  RETRIEVED_ATTRIBUTES,
  shapeResponse,
  VIA_HITS_PER_PAGE,
} from "@/lib/search/search-query";
import { searchUserToken } from "@/lib/search/user-token";
import { BLOG_URL } from "@/lib/www-nav";

/**
 * GET /api/search?q=…&type=…&match=loose — the www ⌘K search (PROD-3110).
 * `&scope=via` returns only the "Products using …" group in full (PROD-3296).
 *
 * One `site_search` query per request, server-side, so the browser never
 * talks to Algolia. Successful responses are CDN-cached by URL, so a repeat of
 * the same query never reaches this function; only misses pass the gate
 * (`lib/search/search-gate.ts`) and cost an Algolia query.
 *
 * Clients should send `q` already normalized (lower-case, single spaces) so
 * equivalent queries share one cache entry.
 */

export const runtime = "nodejs";

const CACHED = "public, max-age=60, s-maxage=600, stale-while-revalidate=3600";
const NO_STORE = "no-store";

function json(body: unknown, status: number, cacheControl: string, extra?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": cacheControl, ...extra },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get("q"));
  const filter = parseTypeFilter(url.searchParams.get("type"));
  const match = effectiveMatch(query, parseMatch(url.searchParams.get("match")));
  // `scope=via` (PROD-3296): inspiration products found through a pre-configured
  // option only — no type filter, no facets, a larger page.
  const via = parseScope(url.searchParams.get("scope")) === "via";

  if (query.length < MIN_QUERY_LENGTH) {
    return json(emptyResponse(query, via ? null : filter), 200, CACHED);
  }

  const client = getSearchClient();
  if (!client) {
    return json({ error: "search_unavailable" }, 503, NO_STORE);
  }

  const ip = clientIpFrom(request.headers);
  const decision = searchGate.check(ip);
  after(() => searchGate.flushIfDue());
  if (!decision.allowed) {
    return json({ error: "rate_limited", reason: decision.reason }, 429, NO_STORE, {
      "Retry-After": String(decision.retryAfterSec),
    });
  }

  const userToken = searchUserToken(ip);
  try {
    const result = await client.searchSingleIndex<Record<string, unknown>>(
      {
        indexName: SITE_SEARCH_INDEX,
        searchParams: {
          query,
          hitsPerPage: via ? VIA_HITS_PER_PAGE : HITS_PER_PAGE,
          facets: via ? [] : ["group", "type"],
          restrictSearchableAttributes: via ? [PRECONFIGURED_ATTRIBUTE] : undefined,
          attributesToRetrieve: [...RETRIEVED_ATTRIBUTES],
          // Read only to tell direct matches from pre-configured ones (PROD-3296).
          attributesToHighlight: [...HIGHLIGHT_ATTRIBUTES],
          filters: via
            ? "kind:inspiration"
            : filter
              ? `${filter.facet}:${filter.value}`
              : undefined,
          removeWordsIfNoResults: match === "loose" ? "allOptional" : undefined,
          analytics: true,
          // Returns a queryID so the dialog can report clicks (PROD-3111).
          clickAnalytics: true,
        },
      },
      userToken ? { headers: { "X-Algolia-UserToken": userToken } } : undefined,
    );
    return json(shapeResponse(query, filter, result, BLOG_URL), 200, CACHED);
  } catch (error) {
    // Log the status only: the client's error object embeds request headers,
    // which include the API key.
    const status = (error as { status?: number } | null)?.status;
    console.error(`[search] Algolia query failed (status ${status ?? "unknown"})`);
    const upstreamLimited = status === 429;
    return json(
      { error: upstreamLimited ? "rate_limited" : "search_failed" },
      upstreamLimited ? 429 : 502,
      NO_STORE,
      upstreamLimited ? { "Retry-After": "60" } : undefined,
    );
  }
}
