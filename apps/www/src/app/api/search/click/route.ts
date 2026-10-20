import { NextResponse } from "next/server";
import { SITE_SEARCH_INDEX } from "@pakfactory/sanity/algolia/site-search";

import { clientIpFrom } from "@/lib/request-ip";
import { getInsightsClient } from "@/lib/search/algolia";
import { createSearchGate } from "@/lib/search/search-gate";
import { searchUserToken } from "@/lib/search/user-token";

/**
 * POST /api/search/click — records which search result a visitor opened
 * (PROD-3111), as an Algolia Insights `clickedObjectIDsAfterSearch` event.
 *
 * The history this builds is what a later ticket uses to rank each browse tab
 * by clicks (rule-based picks until there is enough data). Sent from our
 * server, so no Algolia key reaches the browser. Body:
 * `{ queryID, objectID, position }` from a `/api/search` response.
 *
 * Abuse: the edge firewall rule covers `/api/search*` (20 / 10 s per IP), and
 * this route allows 60 clicks per IP per minute per instance. Clicks only feed
 * ranking, never billing — Insights events are not search requests.
 */

export const runtime = "nodejs";

const QUERY_ID = /^[a-f0-9]{32}$/;
const OBJECT_ID = /^[A-Za-z0-9._:-]{1,200}$/;

// Same limiter as search, without a site-wide budget (clicks cost no queries).
const clickGate = createSearchGate({
  perIpLimit: 60,
  perIpWindowMs: 60 * 1000,
  instancePerMinute: 1200,
  hourlyBudget: Number.MAX_SAFE_INTEGER,
  flushIntervalMs: 60 * 60 * 1000,
  maxFlushDelta: 0,
  flush: async () => null,
});

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: noStore });
  }
  const { queryID, objectID, position } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof queryID !== "string" ||
    !QUERY_ID.test(queryID) ||
    typeof objectID !== "string" ||
    !OBJECT_ID.test(objectID) ||
    typeof position !== "number" ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > 1000
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: noStore });
  }

  const ip = clientIpFrom(request.headers);
  const decision = clickGate.check(ip);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...noStore, "Retry-After": String(decision.retryAfterSec) } },
    );
  }

  const insights = getInsightsClient();
  if (!insights) return new NextResponse(null, { status: 204, headers: noStore });

  try {
    await insights.pushEvents({
      events: [
        {
          eventType: "click",
          eventName: "Search result clicked",
          index: SITE_SEARCH_INDEX,
          queryID,
          objectIDs: [objectID],
          positions: [position],
          userToken: searchUserToken(ip) ?? "anonymous",
        },
      ],
    });
  } catch (error) {
    // Status only: the client's error object embeds the API key.
    const status = (error as { status?: number } | null)?.status;
    console.warn(`[search] click event failed (status ${status ?? "unknown"})`);
  }
  return new NextResponse(null, { status: 204, headers: noStore });
}
