/** ISR TTL for blog post surfaces (home, post, RSS). Align with Sanity webhook revalidation when added. */
export const BLOG_REVALIDATE_SECONDS = 60;

/** Shared cache tag for post-derived routes (RSS, listings) when using `cacheTag` / webhooks. */
export const BLOG_POSTS_CACHE_TAG = "blog-posts";

/** Cache tag for the CMS redirect map; revalidated by the Sanity webhook on redirect/post changes. */
export const BLOG_REDIRECTS_CACHE_TAG = "blog-redirects";

/** Cache tag for Blog Settings singleton (nav order, SEO defaults). */
export const BLOG_SETTINGS_CACHE_TAG = "blog-settings";

/** Cache tag for Global Settings singleton (org, OG defaults, embed hosts, GTM). */
export const BLOG_GLOBAL_SETTINGS_CACHE_TAG = "blog-global-settings";
