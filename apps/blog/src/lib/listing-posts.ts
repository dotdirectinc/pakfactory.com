import type { PostCardData } from "@/components/modules/post-card";
import {
  getTotalArchivePages,
  isArchivePageOutOfRange,
} from "@/lib/blog-archive";

/**
 * Client-safe listing card — display fields plus sort keys so listing islands
 * can filter/sort/paginate without another Sanity round-trip.
 */
export type ListingPost = PostCardData & {
  /** Post slug (JSON-LD / share links). */
  slug: string;
  /** coalesce(lastModified, _updatedAt) ISO string for "Recently updated". */
  sortUpdatedAt: string;
  viewCount: number;
};

/** @deprecated Prefer ListingPost — alias kept for topic call sites. */
export type TopicListingPost = ListingPost;

export type ListingFilters = {
  categories: string[];
  sort: "newest" | "updated" | "popular";
};

/** @deprecated Prefer ListingFilters. */
export type TopicListingFilters = ListingFilters;

export function filterListingPosts(
  posts: ListingPost[],
  filters: ListingFilters,
): ListingPost[] {
  if (filters.categories.length === 0) return posts;
  const selected = new Set(filters.categories);
  return posts.filter(
    (post) => post.categorySlug != null && selected.has(post.categorySlug),
  );
}

export function sortListingPosts(
  posts: ListingPost[],
  sort: ListingFilters["sort"],
): ListingPost[] {
  const sorted = [...posts];
  switch (sort) {
    case "updated":
      sorted.sort((a, b) => {
        const diff =
          Date.parse(b.sortUpdatedAt || "") - Date.parse(a.sortUpdatedAt || "");
        if (diff !== 0) return diff;
        return Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || "");
      });
      break;
    case "popular":
      sorted.sort((a, b) => {
        if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
        return Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || "");
      });
      break;
    default:
      sorted.sort(
        (a, b) =>
          Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""),
      );
  }
  return sorted;
}

export function sliceListingPage(
  posts: ListingPost[],
  pageNumber: number,
  perPage: number,
): {
  pagePosts: ListingPost[];
  totalCount: number;
  totalPages: number;
  isOutOfRange: boolean;
} {
  const totalCount = posts.length;
  const totalPages = getTotalArchivePages(totalCount, perPage);
  const isOutOfRange = isArchivePageOutOfRange(pageNumber, totalCount, perPage);
  if (isOutOfRange) {
    return { pagePosts: [], totalCount, totalPages, isOutOfRange };
  }
  const start = (pageNumber - 1) * perPage;
  return {
    pagePosts: posts.slice(start, start + perPage),
    totalCount,
    totalPages,
    isOutOfRange,
  };
}

/** Filter → sort → paginate (shared by SSR slice + client islands). */
export function resolveListingPage(
  allPosts: ListingPost[],
  filters: ListingFilters,
  pageNumber: number,
  perPage: number,
) {
  const filtered = filterListingPosts(allPosts, filters);
  const sorted = sortListingPosts(filtered, filters.sort);
  return sliceListingPage(sorted, pageNumber, perPage);
}

/** @deprecated Prefer resolveListingPage. */
export const resolveTopicListingPage = resolveListingPage;
export const filterTopicListingPosts = filterListingPosts;
export const sortTopicListingPosts = sortListingPosts;
export const sliceTopicListingPage = sliceListingPage;
