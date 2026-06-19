import {
  BLOG_CATEGORY_SLUGS,
  isKnownCategorySlug,
  type BlogCategorySlug,
} from "@pakfactory/sanity/blog-reserved-slugs";

export { BLOG_CATEGORY_SLUGS, isKnownCategorySlug, type BlogCategorySlug };

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

export function getCategoryFallback(slug: string): BlogCategoryChip | undefined {
  return BLOG_CATEGORY_FALLBACK.find((c) => c.slug === slug);
}

export type BlogCategoryChip = { _id?: string; slug: string; title: string };

export const PACKAGING_NEWS_SLUG = "packaging-news" as const;
