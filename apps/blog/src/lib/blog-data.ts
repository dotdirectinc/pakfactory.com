import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_CATEGORIES_QUERY,
  POPULAR_POSTS_LATEST_QUERY,
  POPULAR_POSTS_THIS_MONTH_QUERY,
} from "@pakfactory/sanity/queries";
import {
  BLOG_CATEGORY_FALLBACK,
  type BlogCategoryChip,
} from "@/lib/blog-categories";

export type PopularPostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  mainImage?: unknown;
  categorySlug?: string;
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function fetchBlogCategories(): Promise<BlogCategoryChip[]> {
  if (!isSanityConfigured()) {
    return [...BLOG_CATEGORY_FALLBACK];
  }
  const rows = await getSanityClient()
    .fetch<BlogCategoryChip[]>(BLOG_CATEGORIES_QUERY, blogLanguageParams())
    .catch(() => []);
  if (rows.length > 0) return rows;
  return [...BLOG_CATEGORY_FALLBACK];
}

export async function fetchPopularPostsThisMonth(): Promise<PopularPostCard[]> {
  if (!isSanityConfigured()) return [];

  const client = getSanityClient();
  const monthStart = monthStartIso();

  const thisMonth = await client
    .fetch<PopularPostCard[]>(
      POPULAR_POSTS_THIS_MONTH_QUERY,
      blogLanguageParams({ monthStart }),
    )
    .catch(() => []);

  if (thisMonth.length >= 3) return thisMonth.slice(0, 3);

  const latest = await client
    .fetch<PopularPostCard[]>(
      POPULAR_POSTS_LATEST_QUERY,
      blogLanguageParams(),
    )
    .catch(() => []);

  const seen = new Set(thisMonth.map((p) => p._id));
  const merged = [...thisMonth];
  for (const post of latest) {
    if (merged.length >= 3) break;
    if (!seen.has(post._id)) {
      seen.add(post._id);
      merged.push(post);
    }
  }
  return merged.slice(0, 3);
}
