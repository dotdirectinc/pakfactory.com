/**
 * Fallback category chips when Sanity is unconfigured or the dataset has no blogCategory docs.
 * Slugs must stay in sync with `apps/studio/schemas/blogCategory.ts` validation.
 */
export const BLOG_CATEGORY_FALLBACK = [
  { slug: "trends", title: "Trends" },
  { slug: "sustainability", title: "Sustainability" },
  { slug: "business-strategy", title: "Business Strategy" },
  { slug: "design-inspiration", title: "Design Inspiration" },
  { slug: "packaging-news", title: "Packaging News" },
] as const;

/** Allowed category slugs — keep in sync with `apps/studio/schemas/blogCategory.ts`. */
export const BLOG_CATEGORY_SLUGS = BLOG_CATEGORY_FALLBACK.map((c) => c.slug);

export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number];

export function isKnownCategorySlug(slug: string): slug is BlogCategorySlug {
  return (BLOG_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function getCategoryFallback(slug: string): BlogCategoryChip | undefined {
  return BLOG_CATEGORY_FALLBACK.find((c) => c.slug === slug);
}

export type BlogCategoryChip = { _id?: string; slug: string; title: string };

export const PACKAGING_NEWS_SLUG = "packaging-news" as const;
