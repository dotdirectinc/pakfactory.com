import "server-only";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { BLOG_REDIRECTS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { BLOG_BASE_PATH, getSiteUrl } from "@/lib/site";
import {
  BLOG_REDIRECTS_CACHE_TAG,
  BLOG_REVALIDATE_SECONDS,
} from "@/lib/blog-cache";
import {
  buildRedirectMap,
  resolveInMap,
  toAbsolute,
  type RedirectMap,
  type RedirectRow,
  type ResolvedRedirect,
} from "@/lib/blog-redirects-core";

export type { ResolvedRedirect };

/**
 * RSC-side CMS redirect resolution. The edge `middleware.ts` resolves redirects
 * before routes match and catches the interception cases (PROD-2154); this
 * remains as a fallback for any would-be-404 that reaches a route, and shares
 * the same core so both behave identically (base-path normalization,
 * trailing-slash collapse, cross-app absolute targets, self-ref guard).
 */
async function fetchRedirectRows(): Promise<RedirectRow[]> {
  if (!isSanityConfigured()) return [];
  return getPublishedSanityClient()
    .fetch<RedirectRow[]>(BLOG_REDIRECTS_QUERY)
    .catch(() => []);
}

/** Cached `from → target` map; invalidated by `revalidateTag(BLOG_REDIRECTS_CACHE_TAG)` from the webhook. */
const getRedirectMap = unstable_cache(
  async (): Promise<RedirectMap> =>
    buildRedirectMap(await fetchRedirectRows(), BLOG_BASE_PATH),
  ["blog-redirects-map"],
  { tags: [BLOG_REDIRECTS_CACHE_TAG], revalidate: BLOG_REVALIDATE_SECONDS },
);

export async function resolveRedirect(
  pathname: string,
): Promise<ResolvedRedirect | null> {
  return resolveInMap(await getRedirectMap(), pathname, BLOG_BASE_PATH);
}

/**
 * Apply a CMS redirect for `pathname` if one exists, otherwise `notFound()`.
 * Always throws (returns `never`); call as the last step of a would-be-404 path.
 * Destinations are emitted absolute so the base path is never double-prepended
 * (correct for cross-app `/case-studies` targets). 301 → 308, 302 → 307.
 */
export async function redirectOrNotFound(pathname: string): Promise<never> {
  const hit = await resolveRedirect(pathname);
  if (hit) {
    const dest = toAbsolute(hit.destination, getSiteUrl());
    if (hit.permanent) permanentRedirect(dest);
    redirect(dest);
  }
  notFound();
}
