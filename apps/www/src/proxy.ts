import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

/** Public Vercel origin host (custom domain). Direct hits here must not be indexed. */
const CUSTOM_ORIGIN_HOST = "origin.case-studies.pakfactory.com";

/**
 * Shared secret nginx sends when proxying apex `/case-studies*` into this app
 * (`proxy_set_header X-Origin-Proxy <secret>`). Without it, Host alone cannot
 * distinguish apex traffic (nginx sets Host to the custom origin) from a
 * browser hitting the origin directly — bouncing `/case-studies` would 307-loop.
 *
 * Set the same value in Vercel env `WWW_ORIGIN_PROXY_SECRET`.
 */
const ORIGIN_PROXY_SECRET = process.env.WWW_ORIGIN_PROXY_SECRET || "";

// The case-study surface owned by this app. Only redirects whose `from` starts
// with this prefix are compiled (see `surfacePrefix` in @pakfactory/redirects).
const SURFACE_PREFIX = "/case-studies";

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
    // No basePath on www; scope to the case-study surface via surfacePrefix.
    const ruleset = buildRuleset(rows, "", SURFACE_PREFIX);
    cache = { ruleset, at: Date.now() };
    return ruleset;
  } catch {
    return cache?.ruleset ?? EMPTY_RULESET; // serve stale on transient fetch failure
  }
}

function requestHost(req: NextRequest): string {
  return (req.headers.get("host") || "").split(":")[0]!.toLowerCase();
}

function isGeneratedVercelHost(host: string): boolean {
  return (
    host.endsWith(".vercel.app") && host.startsWith("pakfactory-com-www")
  );
}

function isPublicOriginHost(host: string): boolean {
  return host === CUSTOM_ORIGIN_HOST || isGeneratedVercelHost(host);
}

/** Apex nginx traffic that must keep serving `/case-studies*` (no lockdown redirect). */
function isTrustedApexProxy(req: NextRequest): boolean {
  if (!ORIGIN_PROXY_SECRET) return false;
  return req.headers.get("x-origin-proxy") === ORIGIN_PROXY_SECRET;
}

function redirectToApex(pathname: string, search: string): NextResponse {
  const res = NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 307);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

/**
 * Origin lockdown (PROD-2207).
 *
 * This app is reachable two ways:
 * 1. Apex proxy — Magento nginx forwards `/case-studies`, `/_next`, SEO assets
 *    with `Host` rewritten to the custom origin.
 * 2. Direct — browser hits `origin.case-studies.pakfactory.com` (or the
 *    generated `.vercel.app`).
 *
 * Direct hits must 307 → `pakfactory.com` (including `/case-studies*`). Apex
 * traffic must NOT, or we loop. Distinguisher: nginx sends
 * `X-Origin-Proxy: $WWW_ORIGIN_PROXY_SECRET`.
 *
 * PRODUCTION ONLY — local/preview must serve the unreleased main site
 * (previews are already SSO-gated + noindex via `WWW_DISABLE_INDEXING`).
 *
 * Temporary (307) on purpose — remove when the main www site launches; a
 * permanent redirect would be cached and painful to reverse.
 */
function originLockdownRedirect(req: NextRequest): NextResponse | null {
  if (process.env.VERCEL_ENV !== "production") return null;
  if (isTrustedApexProxy(req)) return null;

  const { pathname, search } = req.nextUrl;
  const host = requestHost(req);
  const secretConfigured = ORIGIN_PROXY_SECRET.length > 0;

  // Generated `.vercel.app` is no longer nginx's upstream — always bounce.
  if (isGeneratedVercelHost(host)) {
    return redirectToApex(pathname, search);
  }

  if (secretConfigured) {
    // Full UX: any direct hit on the custom origin → apex (incl. /case-studies*).
    if (isPublicOriginHost(host)) {
      return redirectToApex(pathname, search);
    }
    // Unknown prod host: still bounce unreleased main-site paths.
    if (!pathname.startsWith("/case-studies")) {
      return redirectToApex(pathname, search);
    }
    return null;
  }

  // Secret not configured yet — legacy safe mode: bounce non-/case-studies only
  // so apex keeps working before nginx sends X-Origin-Proxy.
  if (!pathname.startsWith("/case-studies")) {
    return redirectToApex(pathname, search);
  }
  return null;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const lockdown = originLockdownRedirect(req);
  if (lockdown) return lockdown;

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

  return withSession(req);
}

/**
 * Refresh the Supabase session and carry the rotated cookies onto the response.
 *
 * ORDER MATTERS, and it is the reason this runs LAST rather than first.
 * Supabase ROTATES the refresh token: a successful refresh invalidates the old
 * one and issues a new pair via Set-Cookie. If we refreshed and then returned a
 * redirect that dropped those cookies, the browser would keep a token the server
 * has already retired — silently signing the buyer out on the next request. So
 * the lockdown redirect (PROD-2207) and CMS redirect resolution (PROD-2157) each
 * get their chance to return first, and the session is only touched on the path
 * that actually returns `next()` and can carry Set-Cookie.
 *
 * getUser(), not getSession(): getSession trusts the cookie as-is, while getUser
 * revalidates it against the auth server. In a proxy that difference is the whole
 * point — a forged or stale cookie must not look like a live session.
 *
 * If the Supabase env is absent this is a no-op returning a plain `next()`, so
 * the case-study surface behaves exactly as it did before auth existed.
 */
async function withSession(req: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to the REQUEST too, so a Server Component rendering later in this
        // same pass reads the refreshed token rather than the one it arrived with.
        for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  // Triggers the refresh when the access token is near expiry. Deliberately does
  // NOT gate anything: route protection is a separate concern and belongs with
  // the routes, not in the redirect proxy.
  await supabase.auth.getUser();

  return res;
}

export const config = {
  // Runs on `/case-studies*` (CMS-redirect resolution) AND on the origin root +
  // any other clean path (the lockdown redirect above). Excludes Next internals,
  // API routes, and static files (paths with a dot) — those cover the SEO/asset
  // paths nginx legitimately proxies to the apex (/sitemap.xml, /llms.txt,
  // /favicon.ico, /_next/*), which must pass through untouched.
  matcher: ["/((?!_next/|api/|.*\\.[^/]+$).*)"],
};
