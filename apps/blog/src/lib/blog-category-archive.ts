import type { HomePostCard } from "@/lib/blog-home";
import {
  getCategoryFallback,
  isKnownCategorySlug,
  type BlogCategorySlug,
} from "@/lib/blog-categories";
import {
  getTotalArchivePages,
  isArchivePageOutOfRange,
  LISTING_PAGE_SIZE,
  parseArchivePageParam,
} from "@/lib/blog-archive";
import {
  getBlogRobotsDirective,
  hasListingFilters,
  parseListingPage,
  type BlogRobotsDirective,
} from "@/lib/seo";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  BLOG_CATEGORY_AUTHORS_FACET_QUERY,
  BLOG_CATEGORY_BY_SLUG_QUERY,
  BLOG_CATEGORY_POSTS_COUNT_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_NEWEST_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_OLDEST_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_TITLE_QUERY,
  BLOG_CATEGORY_TAGS_FACET_QUERY,
} from "@pakfactory/sanity/queries";

export type CategorySort = "newest" | "oldest" | "title";

export type CategoryDocument = {
  _id?: string;
  title: string;
  slug: string;
  descriptionText?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
};

export type CategoryFacetTag = { _id?: string; title: string; slug: string };
export type CategoryFacetAuthor = { _id?: string; name: string; slug: string };

export type CategoryListFilters = {
  tag?: string;
  author?: string;
  year?: string;
  month?: string;
  sort: CategorySort;
};

export type CategoryArchivePageData = {
  category: CategoryDocument;
  posts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  filters: CategoryListFilters;
  tags: CategoryFacetTag[];
  authors: CategoryFacetAuthor[];
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function parseCategorySort(raw: string | undefined): CategorySort {
  if (raw === "oldest" || raw === "title") return raw;
  return "newest";
}

export function parseCategoryFilters(
  searchParams: SearchParams,
): CategoryListFilters {
  return {
    tag: firstParam(searchParams.tag)?.trim() || undefined,
    author: firstParam(searchParams.author)?.trim() || undefined,
    year: firstParam(searchParams.year)?.trim() || undefined,
    month: firstParam(searchParams.month)?.trim() || undefined,
    sort: parseCategorySort(firstParam(searchParams.sort)),
  };
}

function yearMonthBounds(
  year?: string,
  month?: string,
): { yearStart: string | null; yearEnd: string | null } {
  if (!year) return { yearStart: null, yearEnd: null };
  const y = Number.parseInt(year, 10);
  if (!Number.isFinite(y)) return { yearStart: null, yearEnd: null };

  if (month) {
    const m = Number.parseInt(month, 10);
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      return {
        yearStart: new Date(Date.UTC(y, 0, 1)).toISOString(),
        yearEnd: new Date(Date.UTC(y + 1, 0, 1)).toISOString(),
      };
    }
    return {
      yearStart: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
      yearEnd: new Date(Date.UTC(y, m, 1)).toISOString(),
    };
  }

  return {
    yearStart: new Date(Date.UTC(y, 0, 1)).toISOString(),
    yearEnd: new Date(Date.UTC(y + 1, 0, 1)).toISOString(),
  };
}

function groqFilterParams(categorySlug: string, filters: CategoryListFilters) {
  const { yearStart, yearEnd } = yearMonthBounds(filters.year, filters.month);
  return {
    categorySlug,
    tagSlug: filters.tag ?? null,
    authorSlug: filters.author ?? null,
    yearStart,
    yearEnd,
  };
}

function postsPageQuery(sort: CategorySort): string {
  switch (sort) {
    case "oldest":
      return BLOG_CATEGORY_POSTS_PAGE_OLDEST_QUERY;
    case "title":
      return BLOG_CATEGORY_POSTS_PAGE_TITLE_QUERY;
    default:
      return BLOG_CATEGORY_POSTS_PAGE_NEWEST_QUERY;
  }
}

export function categoryPageHref(
  categorySlug: string,
  pageNumber: number,
  filters: CategoryListFilters,
): string {
  const base = pageNumber <= 1 ? `/category/${categorySlug}` : `/category/${categorySlug}/page/${pageNumber}`;
  const params = new URLSearchParams();
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.author) params.set("author", filters.author);
  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getCategoryListingRobots(
  pageNumber: number,
  searchParams: SearchParams,
): BlogRobotsDirective {
  return getBlogRobotsDirective({
    kind: "category",
    pageNumber,
    hasActiveFilters: hasListingFilters(searchParams),
  });
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<CategoryDocument | null> {
  if (!isKnownCategorySlug(slug)) return null;

  const fallback = getCategoryFallback(slug);
  if (!isSanityConfigured()) {
    return fallback
      ? {
          title: fallback.title,
          slug: fallback.slug,
          descriptionText: "",
        }
      : null;
  }

  const doc = await getSanityClient()
    .fetch<CategoryDocument | null>(BLOG_CATEGORY_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (doc?.slug) return doc;
  if (fallback) {
    return { title: fallback.title, slug: fallback.slug, descriptionText: "" };
  }
  return null;
}

export async function fetchCategoryArchivePage(
  categorySlug: BlogCategorySlug,
  pageNumber: number,
  filters: CategoryListFilters,
): Promise<CategoryArchivePageData | null> {
  const category = await fetchCategoryBySlug(categorySlug);
  if (!category) return null;

  const groqParams = groqFilterParams(categorySlug, filters);
  let totalCount = 0;

  if (isSanityConfigured()) {
    totalCount = await getSanityClient()
      .fetch<number>(BLOG_CATEGORY_POSTS_COUNT_QUERY, groqParams)
      .catch(() => 0);
  }

  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return {
      category,
      posts: [],
      totalCount,
      pageNumber,
      totalPages,
      filters,
      tags: [],
      authors: [],
    };
  }

  let posts: HomePostCard[] = [];
  let tags: CategoryFacetTag[] = [];
  let authors: CategoryFacetAuthor[] = [];

  if (isSanityConfigured()) {
    const start = (pageNumber - 1) * LISTING_PAGE_SIZE;
    const end = start + LISTING_PAGE_SIZE;
    const client = getSanityClient();
    [posts, tags, authors] = await Promise.all([
      client
        .fetch<HomePostCard[]>(postsPageQuery(filters.sort), {
          ...groqParams,
          start,
          end,
        })
        .catch(() => []),
      client
        .fetch<CategoryFacetTag[]>(BLOG_CATEGORY_TAGS_FACET_QUERY, {
          categorySlug,
        })
        .catch(() => []),
      client
        .fetch<CategoryFacetAuthor[]>(BLOG_CATEGORY_AUTHORS_FACET_QUERY, {
          categorySlug,
        })
        .catch(() => []),
    ]);
  }

  return {
    category,
    posts,
    totalCount,
    pageNumber,
    totalPages,
    filters,
    tags,
    authors,
  };
}

export function parseCategoryPageFromSearchParams(
  searchParams: SearchParams,
): number {
  return parseListingPage(searchParams);
}

export { parseArchivePageParam, isArchivePageOutOfRange };
