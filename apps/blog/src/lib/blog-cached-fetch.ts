import { unstable_cache } from "next/cache";
import { BLOG_CONTENT_REVALIDATE_SECONDS } from "@/lib/blog-cache";
import { getPublishedSanityClient, getSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

/** Deterministic serialization of GROQ params so it can key the cache stably. */
function stableParams(params: Record<string, unknown>): string {
  const keys = Object.keys(params).sort();
  return JSON.stringify(keys.map((k) => [k, params[k]]));
}

export type BlogCachedFetch<T> = {
  /** Stable identifier for this query (e.g. "category-archive"); part of the cache key. */
  cacheKey: string;
  /** The GROQ query. */
  query: string;
  /** Query params. Serialized into the cache key so different params never collide. */
  params?: Record<string, unknown>;
  /**
   * Cache tags the Sanity webhook busts to invalidate this read. Drives instant
   * editor freshness — pick the tag(s) matching the doc types this query reads
   * (e.g. a category archive reads posts + a category → BLOG_POSTS + BLOG_CATEGORY).
   */
  tags: string[];
  /** Safety-net TTL; defaults to BLOG_CONTENT_REVALIDATE_SECONDS. Freshness is tag-driven. */
  revalidate?: number;
  /** Returned on error or when Sanity is unconfigured — never throws to a blank page. */
  fallback: T;
  /** Optional label for dev error logs. */
  label?: string;
};

/**
 * Cached, draft-aware Sanity read for Blog content (PROD-2183).
 *
 * - **Published (default):** result is cached via `unstable_cache`, tagged for
 *   webhook invalidation. One Sanity read serves every visitor until the TTL
 *   lapses or the webhook busts a tag — this is the CDN-cost win.
 * - **Draft mode on:** bypasses the cache and reads live drafts, so editors in
 *   Studio Presentation still see unpublished changes instantly.
 * - **Error / unconfigured:** returns `fallback` instead of throwing, so a Sanity
 *   outage or quota block serves cached/empty content, not a blank page (AC#2).
 *
 * NOTE: this checks `draftMode()`, which currently marks the route dynamic. That is
 * acceptable for the cost goal — `unstable_cache` dedupes the Sanity read across
 * requests regardless of route staticness. Phase 2 removes the dynamic taint from
 * the published path for the LCP/ISR goals.
 */
export async function blogCachedFetch<T>(opts: BlogCachedFetch<T>): Promise<T> {
  if (!isSanityConfigured()) return opts.fallback;

  const { draftMode } = await import("next/headers");
  const isDraft = (await draftMode()).isEnabled;
  const params = opts.params ?? {};

  // Draft mode (Studio Presentation) OR local dev → read live, never cached, so
  // editors and developers see changes immediately. Production published reads below
  // are cached for the CDN-cost win.
  if (isDraft || process.env.NODE_ENV === "development") {
    try {
      const client = isDraft
        ? await getSanityClient()
        : getPublishedSanityClient();
      return await client.fetch<T>(opts.query, params);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[blog-cached-fetch] ${opts.label ?? opts.cacheKey} (live) failed:`, err);
      }
      return opts.fallback;
    }
  }

  const load = unstable_cache(
    async () => getPublishedSanityClient().fetch<T>(opts.query, params),
    // Key by cacheKey + the query text + params, so callers that reuse a cacheKey
    // across query variants (e.g. sort-specific listing queries) never collide.
    [opts.cacheKey, opts.query, stableParams(params)],
    {
      revalidate: opts.revalidate ?? BLOG_CONTENT_REVALIDATE_SECONDS,
      tags: opts.tags,
    },
  );

  try {
    return await load();
  } catch (err) {
    // Prod-only path (dev returns above). Log unconditionally — a failure here is a
    // real Sanity outage / quota block, and we're swallowing it to serve `fallback`.
    console.error(`[blog-cached-fetch] ${opts.label ?? opts.cacheKey} failed:`, err);
    return opts.fallback;
  }
}
