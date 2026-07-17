import { NextResponse, type NextRequest } from "next/server";
import {
  buildRedirectMap,
  normalizePath,
  resolveInMap,
  toAbsolute,
  type RedirectMap,
  type RedirectRow,
} from "@/lib/blog-redirects-core";

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
  `*[_type == "redirect" && isActive == true && defined(from) && defined(to)]` +
  `{"from": from, "to": to, "type": type}`;

const CACHE_TTL_MS = 60_000;
let cache: { map: RedirectMap; at: number } | null = null;

async function getRedirectMap(): Promise<RedirectMap> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.map;
  if (!PROJECT) return {};
  try {
    const url =
      `https://${PROJECT}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
      `?query=${encodeURIComponent(REDIRECTS_QUERY)}`;
    const res = await fetch(
      url,
      READ_TOKEN ? { headers: { Authorization: `Bearer ${READ_TOKEN}` } } : {},
    );
    const rows = ((await res.json())?.result ?? []) as RedirectRow[];
    const map = buildRedirectMap(rows, BASE_PATH);
    cache = { map, at: Date.now() };
    return map;
  } catch {
    return cache?.map ?? {}; // serve stale on transient fetch failure
  }
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl; // base-path-less (Next strips it)

  const hit = resolveInMap(await getRedirectMap(), pathname, BASE_PATH);
  if (hit) {
    return NextResponse.redirect(
      toAbsolute(hit.destination, SITE_URL),
      hit.permanent ? 308 : 307,
    );
  }

  // Legacy fallback: /tag/{slug}[/page/N] → /topics/{slug}[/page/N].
  // CMS docs above take precedence (an explicit tag redirect wins); this only
  // covers tag URLs with no doc, preserving the old config-rewrite behavior now
  // that it's removed from next.config so CMS can win.
  const tag = pathname.match(/^\/tag\/([^/]+)((?:\/page\/\d+)?)\/?$/);
  if (tag) {
    return NextResponse.redirect(
      toAbsolute(normalizePath(`${BASE_PATH}/topics/${tag[1]}${tag[2]}`), SITE_URL),
      308,
    );
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, API routes, and static files (paths with a dot).
  matcher: ["/((?!_next/|api/|.*\\.[^/]+$).*)"],
};
