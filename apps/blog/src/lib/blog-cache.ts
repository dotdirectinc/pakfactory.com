/** ISR TTL for blog post surfaces (home, post, RSS). Align with Sanity webhook revalidation when added. */
export const BLOG_REVALIDATE_SECONDS = 60;

/** Shared cache tag for post-derived routes (RSS, listings) when using `cacheTag` / webhooks. */
export const BLOG_POSTS_CACHE_TAG = "blog-posts";
