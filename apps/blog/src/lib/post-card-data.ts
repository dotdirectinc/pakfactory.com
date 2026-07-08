import "server-only";

import type { PostCardData } from "@/components/modules/post-card";
import type { PopularPostCard } from "@/lib/blog-data";
import type { HomePostCard } from "@/lib/blog-home";
import { postDetailHref } from "@/lib/blog-post-url";
import { sanityImageAlt, sanityImageUrl } from "@/lib/sanity-image";

export type { PostCardData };

function formatPostDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatReadingTime(minutes?: number): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }
  const clamped = Math.max(1, Math.round(minutes));
  return `${clamped}min read`;
}

type ToPostCardDataOptions = {
  /** When set, used for href resolution (overrides post.categorySlug). */
  categorySlug?: string;
  /** Image width passed to sanityImageUrl. */
  imageWidth?: number;
};

export function toPostCardData(
  post: HomePostCard,
  options: ToPostCardDataOptions = {},
): PostCardData {
  const { categorySlug, imageWidth = 400 } = options;
  const href = postDetailHref(post.slug, categorySlug ?? post.categorySlug);

  return {
    _id: post._id,
    href,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: sanityImageUrl(post.mainImage, imageWidth),
    imageAlt: sanityImageAlt(post.mainImage),
    categoryTitle: post.categoryTitle,
    authorName: post.authorName,
    authorImageUrl: post.authorImageUrl,
    publishedAt: post.publishedAt,
    formattedDate: formatPostDate(post.publishedAt),
    readingTimeLabel: formatReadingTime(post.readingTimeMinutes),
  };
}

export function toPostCardDataList(
  posts: HomePostCard[],
  options: ToPostCardDataOptions = {},
): PostCardData[] {
  return posts.map((post) => toPostCardData(post, options));
}

export function toPostCardDataFromPopular(post: PopularPostCard): PostCardData {
  return toPostCardData(post);
}

export function toPostCardDataListFromPopular(
  posts: PopularPostCard[],
): PostCardData[] {
  return posts.map(toPostCardDataFromPopular);
}
