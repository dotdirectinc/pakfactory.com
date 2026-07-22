/** ISR TTL for blog post surfaces (home, post). Align with Sanity webhook revalidation when added. */
export const BLOG_REVALIDATE_SECONDS = 60;

/**
 * ISR TTL for the RSS feed (`/rss.xml`) — hourly. The feed is a poll-based syndication
 * surface for aggregators, not a live page, so it tolerates a longer cache window than
 * the 60s post surfaces. It is not wired into the Sanity webhook, so this TTL is the only
 * thing that refreshes it. Keep in sync with the literal `export const revalidate` in the
 * RSS route (Next requires that to be a literal).
 */
export const BLOG_RSS_REVALIDATE_SECONDS = 3600;

/** Shared cache tag for post-derived routes (RSS, listings) when using `cacheTag` / webhooks. */
export const BLOG_POSTS_CACHE_TAG = "blog-posts";

/** Cache tag for the CMS redirect map; revalidated by the Sanity webhook on redirect/post changes. */
export const BLOG_REDIRECTS_CACHE_TAG = "blog-redirects";

/** Cache tag for Blog Settings singleton (nav order, SEO defaults). */
export const BLOG_SETTINGS_CACHE_TAG = "blog-settings";

/** Cache tag for Global Settings singleton (org, OG defaults, embed hosts, GTM). */
export const BLOG_GLOBAL_SETTINGS_CACHE_TAG = "blog-global-settings";
