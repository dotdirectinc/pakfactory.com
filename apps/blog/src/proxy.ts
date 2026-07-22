import { NextResponse, type NextRequest } from "next/server";
import {
  buildRuleset,
  normalizePath,
  resolveRedirect,
  toAbsolute,
  type RedirectRuleset,
  type RedirectRow,
} from "@pakfactory/redirects";

/**
 * CMS-redirect proxy (Next 16's renamed middleware — PROD-2154). Resolves Sanity
 * `redirect` docs for the full incoming path BEFORE any route matches — so legacy
 * multi-segment, `/author/*`, and `/tag/*` paths get their configured target
 * instead of being intercepted by `/{cat}/{postSlug}`, the author route, or a
 * config rewrite.
 *
 * Runs at the edge, so it can't use the RSC redirect resolver (server-only +
 * next/cache + @sanity/client). It fetches the redirect set with a plain `fetch`
 * to the Sanity query API and caches it in a module-level map with a short TTL.
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
const BASE_PATH = (process.env.NEXT_PUBLIC_BLOG_BASE_PATH || "").replace(/\/$/, "");
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://pakfactory.com"
).replace(/\/$/, "");

const REDIRECTS_QUERY =
  `*[_type == "redirect" && isActive == true && defined(from) && (defined(to) || behaviour == "gone")]` +
  `{"from": from, "to": to, "matchType": matchType, "behaviour": behaviour, "priority": priority, "appendMatchedTail": appendMatchedTail}`;

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
    const ruleset = buildRuleset(rows, BASE_PATH);
    cache = { ruleset, at: Date.now() };
    return ruleset;
  } catch {
    return cache?.ruleset ?? EMPTY_RULESET; // serve stale on transient fetch failure
  }
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl; // base-path-less (Next strips it)

  // Legacy WordPress search (`?s=…`, e.g. the archived WP blog / old indexed
  // search URLs) → the new search page (`/search?q=…`). Only the `s` value is
  // carried over; Elementor's `?e_search_props=…` junk is dropped. `s` is not a
  // param the new blog uses, so matching on its presence is safe. 301 — the old
  // search scheme is permanently replaced.
  const legacyQuery = req.nextUrl.searchParams.get("s");
  if (legacyQuery) {
    const search = toAbsolute(normalizePath(`${BASE_PATH}/search`), SITE_URL);
    return NextResponse.redirect(
      `${search}?q=${encodeURIComponent(legacyQuery)}`,
      301,
    );
  }

  const hit = resolveRedirect(await getRuleset(), pathname, BASE_PATH);
  if (hit) {
    if (hit.status === 410) {
      // Gone — no destination; tell crawlers the page is permanently removed.
      return new NextResponse("410 Gone", { status: 410 });
    }
    // Edge emits the doc's real status: 301 permanent / 302 temporary (the RSC
    // fallback is limited to 308/307). `destination` is non-null for 301/302.
    return NextResponse.redirect(
      toAbsolute(hit.destination as string, SITE_URL),
      hit.status,
    );
  }

  // Legacy fallback: /tag/{slug}[/page/N] → /topics/{slug}[/page/N].
  // CMS docs above take precedence (an explicit tag redirect wins); this only
  // covers tag URLs with no doc, preserving the old config-rewrite behavior now
  // that it's removed from next.config so CMS can win.
  const tag = pathname.match(/^\/tag\/([^/]+)((?:\/page\/\d+)?)\/?$/);
  if (tag) {
    // Permanent content move (legacy tag → topic) — 301, consistent with the
    // CMS permanent redirects above.
    return NextResponse.redirect(
      toAbsolute(normalizePath(`${BASE_PATH}/topics/${tag[1]}${tag[2]}`), SITE_URL),
      301,
    );
  }

  // Trailing-slash normalization (Next's built-in is disabled via
  // skipTrailingSlashRedirect so the redirects above stay single-hop). Any
  // non-redirect page with a trailing slash canonicalizes to the slashless form,
  // preserving the query string. This is a same-resource canonicalization (not a
  // content move), so it stays 308 — method-preserving, matching the Next
  // built-in it replaces — rather than the 301 used for moved content.
  if (pathname !== "/" && pathname.endsWith("/")) {
    const canonical = toAbsolute(
      normalizePath(`${BASE_PATH}${pathname}`),
      SITE_URL,
    );
    return NextResponse.redirect(`${canonical}${req.nextUrl.search}`, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, API routes, and static files (paths with a
  // dot). The explicit "/" entry is required so the proxy also runs on the blog
  // root (`/blog` / `/blog/`) — the second pattern doesn't match it — which the
  // legacy `?s=` search catch above needs (old WP search was `/blog?s=…`).
  matcher: ["/", "/((?!_next/|api/|.*\\.[^/]+$).*)"],
};
