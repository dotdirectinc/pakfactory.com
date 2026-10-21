import { after, NextResponse } from "next/server";
import { SITE_SEARCH_INDEX } from "@pakfactory/sanity/algolia/site-search";

import { clientIpFrom } from "@/lib/request-ip";
import { getSearchClient } from "@/lib/search/algolia";
import { searchGate } from "@/lib/search/search-budget";
import {
  emptyResponse,
  HITS_PER_PAGE,
  MIN_QUERY_LENGTH,
  normalizeQuery,
  effectiveMatch,
  parseMatch,
  parseTypeFilter,
  RETRIEVED_ATTRIBUTES,
  shapeResponse,
} from "@/lib/search/search-query";
import { searchUserToken } from "@/lib/search/user-token";
import { BLOG_URL } from "@/lib/www-nav";

/**
 * GET /api/search?q=…&type=…&match=loose — the www ⌘K search (PROD-3110).
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

  if (query.length < MIN_QUERY_LENGTH) {
    return json(emptyResponse(query, filter), 200, CACHED);
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
          hitsPerPage: HITS_PER_PAGE,
          facets: ["group", "type"],
          attributesToRetrieve: [...RETRIEVED_ATTRIBUTES],
          attributesToHighlight: [],
          filters: filter ? `${filter.facet}:${filter.value}` : undefined,
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
