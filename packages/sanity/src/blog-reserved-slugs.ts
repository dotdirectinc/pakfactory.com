/**
 * Slugs that must never be used for blogPage or post documents — they collide
 * with App Router static segments or the category/post resolver (ADR-009).
 * Keep in sync with apps/blog/CLAUDE.md reserved-segment list.
 */
export const BLOG_RESERVED_SLUGS = [
  "all",
  "api",
  "author",
  "contribute",
  "rss.xml",
  "search",
  "sitemap.xml",
  "tag",
] as const;

/** Known category archive slugs (PROD-1597 / studio blogCategory validation). */
export const BLOG_CATEGORY_SLUGS = [
  "trends",
  "sustainability",
  "business-strategy",
  "design-inspiration",
  "packaging-news",
] as const;

export type BlogReservedSlug = (typeof BLOG_RESERVED_SLUGS)[number];
export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number];

/** Slugs blocked for blogPage landing/static documents. */
export const BLOG_PAGE_BLOCKED_SLUGS: readonly string[] = [
  ...BLOG_RESERVED_SLUGS,
  ...BLOG_CATEGORY_SLUGS,
];

export function isBlockedBlogPageSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return BLOG_PAGE_BLOCKED_SLUGS.includes(slug);
}

export function isKnownCategorySlug(slug: string): slug is BlogCategorySlug {
  return (BLOG_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
