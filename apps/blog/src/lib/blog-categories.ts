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

export type BlogCategoryChip = { _id?: string; slug: string; title: string };
