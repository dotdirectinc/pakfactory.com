import "server-only";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { BLOG_REDIRECTS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_REDIRECTS_CACHE_TAG,
  BLOG_REVALIDATE_SECONDS,
} from "@/lib/blog-cache";

type RedirectRow = { from?: string; to?: string; type?: string };

/** A resolved redirect target. `permanent` → 308, otherwise → 307 (302 in CMS). */
export type ResolvedRedirect = { destination: string; permanent: boolean };

/** Max hops to follow when collapsing a redirect chain at read time (defense in depth). */
const MAX_HOPS = 5;

/** Leading slash, no trailing slash (except root). Mirrors how the publish action stores paths. */
function normalizePath(path: string): string {
  const withLead = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withLead.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

async function fetchRedirectRows(): Promise<RedirectRow[]> {
  if (!isSanityConfigured()) return [];
  return getPublishedSanityClient()
    .fetch<RedirectRow[]>(BLOG_REDIRECTS_QUERY)
    .catch(() => []);
}

/**
 * Cached `from → {destination, permanent}` map. One Sanity read per cache window;
 * invalidated immediately by `revalidateTag(BLOG_REDIRECTS_CACHE_TAG)` from the webhook.
 */
const getRedirectMap = unstable_cache(
  async (): Promise<Record<string, ResolvedRedirect>> => {
    const rows = await fetchRedirectRows();
    const map: Record<string, ResolvedRedirect> = {};
    for (const row of rows) {
      if (!row?.from || !row?.to) continue;
      map[normalizePath(row.from)] = {
        destination: row.to,
        permanent: row.type !== "302",
      };
    }
    return map;
  },
  ["blog-redirects-map"],
  { tags: [BLOG_REDIRECTS_CACHE_TAG], revalidate: BLOG_REVALIDATE_SECONDS },
);

/**
 * Resolve a CMS redirect for `pathname`. Follows internal chains up to `MAX_HOPS`
 * (write-time collapse should keep these flat) and degrades to a temporary
 * redirect if any hop is temporary. Returns null when there's no match.
 */
export async function resolveRedirect(
  pathname: string,
): Promise<ResolvedRedirect | null> {
  const map = await getRedirectMap();
  let current = normalizePath(pathname);
  const seen = new Set<string>();
  let result: ResolvedRedirect | null = null;
  let permanent = true;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (seen.has(current)) break; // loop guard
    seen.add(current);
    const hit = map[current];
    if (!hit) break;
    permanent = permanent && hit.permanent;
    result = { destination: hit.destination, permanent };
    if (!hit.destination.startsWith("/")) break; // absolute URL — stop following
    const next = normalizePath(hit.destination);
    if (!map[next]) break;
    current = next;
  }

  return result;
}

/**
 * Apply a CMS redirect for `pathname` if one exists, otherwise `notFound()`.
 * Always throws (returns `never`); call as the last step of a would-be-404 path.
 * 301 → `permanentRedirect` (308), 302 → `redirect` (307).
 */
export async function redirectOrNotFound(pathname: string): Promise<never> {
  const hit = await resolveRedirect(pathname);
  if (hit) {
    if (hit.permanent) permanentRedirect(hit.destination);
    redirect(hit.destination);
  }
  notFound();
}
