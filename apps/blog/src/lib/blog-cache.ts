/** ISR TTL for blog post surfaces (home, post). Align with Sanity webhook revalidation when added. */
export const BLOG_REVALIDATE_SECONDS = 60;

/**
 * TTL (seconds) for CACHED CONTENT READS (`blogCachedFetch` — home, archives, post,
 * topic, author, page). This is a **safety net only**: freshness is driven by the
 * Sanity webhook busting the relevant cache tag on publish (`revalidateTag`), so an
 * editor's change shows in ~1–3s regardless of this value. A long TTL therefore
 * maximizes cost savings (one Sanity read serves many visitors between real changes)
 * without delaying editors. Keep the TTL as the floor that covers a *missed* webhook.
 */
export const BLOG_CONTENT_REVALIDATE_SECONDS = 3600;

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

/**
 * Content-taxonomy cache tags (PROD-2183). Each maps a Studio doc type to the cached
 * reads that render it, so the webhook can bust exactly the surfaces an editor changed
 * and no more. A `blogCategory` / `blogTag` / `author` edit busts the matching tag →
 * that archive rebuilds on the next request (instant), while unrelated caches survive.
 */
export const BLOG_CATEGORY_CACHE_TAG = "blog-category";
export const BLOG_TOPIC_CACHE_TAG = "blog-topic";
export const BLOG_AUTHOR_CACHE_TAG = "blog-author";

/**
 * Cache tag for `blogPage` docs (home, topics, contribute, search, landing, static
 * page builders). Busted on any `blogPage` publish so cached page-builder reads
 * rebuild instantly — `revalidatePath` alone does not invalidate `unstable_cache` tags.
 */
export const BLOG_PAGE_CACHE_TAG = "blog-page";

/** Per-entity tag helpers — bust one post/category/topic/author detail page precisely. */
export const blogPostTag = (slug: string) => `blog-post:${slug}`;
export const blogCategoryTag = (slug: string) => `blog-category:${slug}`;
export const blogTopicTag = (slug: string) => `blog-topic:${slug}`;
export const blogAuthorTag = (slug: string) => `blog-author:${slug}`;

/** Cache tag for the CMS redirect map; revalidated by the Sanity webhook on redirect/post changes. */
export const BLOG_REDIRECTS_CACHE_TAG = "blog-redirects";

/** Cache tag for Blog Settings singleton (nav order, SEO defaults). */
export const BLOG_SETTINGS_CACHE_TAG = "blog-settings";

/** Cache tag for Global Settings singleton (org, OG defaults, embed hosts, GTM). */
export const BLOG_GLOBAL_SETTINGS_CACHE_TAG = "blog-global-settings";
