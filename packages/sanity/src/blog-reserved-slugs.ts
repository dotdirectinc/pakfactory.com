/**
 * Slugs that must never be used for blogPage or post documents — they collide
 * with App Router static segments or the category/post resolver (ADR-009).
 * Keep in sync with apps/blog/CLAUDE.md reserved-segment list.
 */
export const BLOG_RESERVED_SLUGS = [
  "all",
  "api",
  "author",
  "authors-sitemap.xml",
  "categories-sitemap.xml",
  "contribute",
  "pages-sitemap.xml",
  "posts-sitemap",
  "rss.xml",
  "search",
  "sitemap.xml",
  "sitemap.xsl",
  "tag",
  "tags-sitemap",
] as const;

export type BlogReservedSlug = (typeof BLOG_RESERVED_SLUGS)[number];

/** Slugs blocked for blogPage landing/static documents (reserved app segments only). */
export const BLOG_PAGE_BLOCKED_SLUGS: readonly string[] = [...BLOG_RESERVED_SLUGS];

export function isBlockedBlogPageSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return (BLOG_PAGE_BLOCKED_SLUGS as string[]).includes(slug);
}
