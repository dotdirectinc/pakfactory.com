import { NextResponse, type NextRequest } from "next/server";
import {
  buildRuleset,
  resolveRedirect,
  toAbsolute,
  type RedirectRuleset,
  type RedirectRow,
} from "@pakfactory/redirects";

/**
 * CMS-redirect proxy for the www app (Next 16's renamed middleware — PROD-2157
 * Phase 3). Resolves Sanity `redirect` docs for **case-study** paths before any
 * route matches, so a renamed case study's old `/case-studies/{slug}` keeps
 * resolving (the `caseStudy` publish action auto-creates the rule on slug change).
 *
 * Scope: only the `/case-studies` surface reaches this app via CloudFront, and the
 * matcher + `surfacePrefix` below keep resolution to redirects whose `from` starts
 * with `/case-studies`. That's the correct per-surface filter — a redirect's owning
 * app is its `from` path prefix, NOT its `channel` (which is target-oriented: a
 * blog→case-studies redirect is `channel: "website"` but has a `/blog/...` from and
 * belongs to the blog proxy). Cross-app targets (`to` on another surface) are
 * emitted as absolute URLs via `toAbsolute`.
 *
 * Runs at the edge, so it shares the runtime-agnostic `@pakfactory/redirects` core
 * with the blog proxy (identical exact/prefix/phrase semantics) and fetches the
 * redirect set with a plain `fetch`, caching it in a module-level map with a short
 * TTL — no `@sanity/client` / `next/cache`.
 */

const PROJECT =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  "production";
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const READ_TOKEN = process.env.SANITY_API_READ_TOKEN || "";
// www serves case studies at the domain root (no basePath); targets resolve
// against the site origin (pakfactory.com).
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_WWW_URL ||
  "https://pakfactory.com"
).replace(/\/$/, "");

// The case-study surface owned by this app. Only redirects whose `from` starts
// with this prefix are compiled (see `surfacePrefix` in @pakfactory/redirects).
const SURFACE_PREFIX = "/case-studies";

const REDIRECTS_QUERY =
  `*[_type == "redirect" && isActive == true && defined(from) && (defined(to) || behaviour == "gone")]` +
  `{"from": from, "to": to, "type": type, "matchType": matchType, "behaviour": behaviour, "priority": priority, "appendMatchedTail": appendMatchedTail}`;

const EMPTY_RULESET: RedirectRuleset = { exact: {}, prefix: [], phrase: [] };
const CACHE_TTL_MS = 60_000;
let cache: { ruleset: RedirectRuleset; at: number } | null = null;

async function getRuleset(): Promise<RedirectRuleset> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.ruleset;
  if (!PROJECT) return EMPTY_RULESET;
  try {
    const url =
      `https://${PROJECT}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
      `?query=${encodeURIComponent(REDIRECTS_QUERY)}`;
    const res = await fetch(
      url,
      READ_TOKEN ? { headers: { Authorization: `Bearer ${READ_TOKEN}` } } : {},
    );
    const rows = ((await res.json())?.result ?? []) as RedirectRow[];
    // No basePath on www; scope to the case-study surface via surfacePrefix.
    const ruleset = buildRuleset(rows, "", SURFACE_PREFIX);
    cache = { ruleset, at: Date.now() };
    return ruleset;
  } catch {
    return cache?.ruleset ?? EMPTY_RULESET; // serve stale on transient fetch failure
  }
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl; // no basePath — path is as served

  const hit = resolveRedirect(await getRuleset(), pathname, "");
  if (hit) {
    if (hit.status === 410) {
      // Gone — no destination; tell crawlers the page is permanently removed.
      return new NextResponse("410 Gone", { status: 410 });
    }
    // Edge emits the doc's real status: 301 permanent / 302 temporary.
    // `destination` is non-null for 301/302; cross-app targets are absolute.
    return NextResponse.redirect(
      toAbsolute(hit.destination as string, SITE_URL),
      hit.status,
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only the case-study surface reaches this app (CloudFront routes just
  // `/case-studies/*` here). Scope the proxy to it, excluding Next internals,
  // API routes, and static files (paths with a dot). The bare `/case-studies`
  // entry covers the index, which the second pattern's `/` prefix skips.
  matcher: [
    "/case-studies",
    "/case-studies/((?!_next/|api/|.*\\.[^/]+$).*)",
  ],
};
