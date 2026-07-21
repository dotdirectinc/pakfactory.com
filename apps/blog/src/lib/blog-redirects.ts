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
  buildRuleset,
  resolveRedirect as resolveInRuleset,
  toAbsolute,
  type RedirectRuleset,
  type RedirectRow,
  type ResolvedRedirect,
} from "@pakfactory/redirects";

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

/** Cached redirect ruleset; invalidated by `revalidateTag(BLOG_REDIRECTS_CACHE_TAG)` from the webhook. */
const getRuleset = unstable_cache(
  async (): Promise<RedirectRuleset> =>
    buildRuleset(await fetchRedirectRows(), BLOG_BASE_PATH),
  ["blog-redirects-ruleset"],
  { tags: [BLOG_REDIRECTS_CACHE_TAG], revalidate: BLOG_REVALIDATE_SECONDS },
);

export async function resolveRedirect(
  pathname: string,
): Promise<ResolvedRedirect | null> {
  return resolveInRuleset(await getRuleset(), pathname, BLOG_BASE_PATH);
}

/**
 * Apply a CMS redirect for `pathname` if one exists, otherwise `notFound()`.
 * Always throws (returns `never`); call as the last step of a would-be-404 path.
 * Destinations are emitted absolute so the base path is never double-prepended
 * (correct for cross-app `/case-studies` targets). A Server Component can only
 * emit 307/308, so: 301 → 308, 302 → 307, and 410 (gone) → notFound (404) — the
 * edge proxy serves the true 410.
 */
export async function redirectOrNotFound(pathname: string): Promise<never> {
  const hit = await resolveRedirect(pathname);
  if (hit) {
    if (hit.status === 410 || hit.destination == null) notFound();
    const dest = toAbsolute(hit.destination, getSiteUrl());
    if (hit.status === 301) permanentRedirect(dest);
    redirect(dest);
  }
  notFound();
}
