import type { HomePostCard } from "@/lib/blog-home";
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
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_TAG_AUTHORS_FACET_QUERY,
  BLOG_TAG_BY_SLUG_QUERY,
  BLOG_TAG_COOCCURRING_TAGS_QUERY,
  BLOG_TAG_POSTS_COUNT_QUERY,
  BLOG_TAG_POSTS_PAGE_NEWEST_QUERY,
  BLOG_TAG_POSTS_PAGE_OLDEST_QUERY,
  BLOG_TAG_POSTS_PAGE_TITLE_QUERY,
} from "@pakfactory/sanity/queries";

export type TagSort = "newest" | "oldest" | "title";

export type TagDocument = {
  _id?: string;
  title: string;
  slug: string;
  descriptionText?: string;
  tagGroup?: string;
  metaTitle?: string;
  metaDescription?: string;
  allowIndex?: boolean;
  allowFollow?: boolean;
  noImageIndex?: boolean;
  ogImageUrl?: string;
};

export type TagFacet = {
  _id?: string;
  title: string;
  slug: string;
  tagGroup?: string;
  order?: number;
};
export type TagFacetAuthor = { _id?: string; name: string; slug: string };

/** Tag is the page itself, so it is not a filter — only author/date/sort narrow the set. */
export type TagListFilters = {
  author?: string;
  year?: string;
  month?: string;
  sort: TagSort;
};

export type TagArchivePageData = {
  tag: TagDocument;
  posts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  filters: TagListFilters;
  cooccurringTags: TagFacet[];
  authors: TagFacetAuthor[];
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function parseTagSort(raw: string | undefined): TagSort {
  if (raw === "oldest" || raw === "title") return raw;
  return "newest";
}

export function parseTagFilters(searchParams: SearchParams): TagListFilters {
  return {
    author: firstParam(searchParams.author)?.trim() || undefined,
    year: firstParam(searchParams.year)?.trim() || undefined,
    month: firstParam(searchParams.month)?.trim() || undefined,
    sort: parseTagSort(firstParam(searchParams.sort)),
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

function groqFilterParams(tagSlug: string, filters: TagListFilters) {
  const { yearStart, yearEnd } = yearMonthBounds(filters.year, filters.month);
  return blogLanguageParams({
    tagSlug,
    authorSlug: filters.author ?? null,
    yearStart,
    yearEnd,
  });
}

function postsPageQuery(sort: TagSort): string {
  switch (sort) {
    case "oldest":
      return BLOG_TAG_POSTS_PAGE_OLDEST_QUERY;
    case "title":
      return BLOG_TAG_POSTS_PAGE_TITLE_QUERY;
    default:
      return BLOG_TAG_POSTS_PAGE_NEWEST_QUERY;
  }
}

export function tagPageHref(
  tagSlug: string,
  pageNumber: number,
  filters: TagListFilters,
): string {
  const base = pageNumber <= 1 ? `/tag/${tagSlug}` : `/tag/${tagSlug}/page/${pageNumber}`;
  const params = new URLSearchParams();
  if (filters.author) params.set("author", filters.author);
  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function fetchTagBySlug(slug: string): Promise<TagDocument | null> {
  if (!isSanityConfigured()) return null;
  const doc = await getSanityClient()
    .fetch<TagDocument | null>(
      BLOG_TAG_BY_SLUG_QUERY,
      blogLanguageParams({ slug }),
    )
    .catch(() => null);
  return doc?.slug ? doc : null;
}

export async function fetchTagArchivePage(
  tagSlug: string,
  pageNumber: number,
  filters: TagListFilters,
): Promise<TagArchivePageData | null> {
  const tag = await fetchTagBySlug(tagSlug);
  if (!tag) return null;

  const groqParams = groqFilterParams(tagSlug, filters);
  let totalCount = 0;

  if (isSanityConfigured()) {
    totalCount = await getSanityClient()
      .fetch<number>(BLOG_TAG_POSTS_COUNT_QUERY, groqParams)
      .catch(() => 0);
  }

  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return {
      tag,
      posts: [],
      totalCount,
      pageNumber,
      totalPages,
      filters,
      cooccurringTags: [],
      authors: [],
    };
  }

  let posts: HomePostCard[] = [];
  let cooccurringTags: TagFacet[] = [];
  let authors: TagFacetAuthor[] = [];

  if (isSanityConfigured()) {
    const start = (pageNumber - 1) * LISTING_PAGE_SIZE;
    const end = start + LISTING_PAGE_SIZE;
    const client = getSanityClient();
    [posts, cooccurringTags, authors] = await Promise.all([
      client
        .fetch<HomePostCard[]>(postsPageQuery(filters.sort), {
          ...groqParams,
          start,
          end,
        })
        .catch(() => []),
      client
        .fetch<TagFacet[]>(
          BLOG_TAG_COOCCURRING_TAGS_QUERY,
          blogLanguageParams({ tagSlug }),
        )
        .catch(() => []),
      client
        .fetch<TagFacetAuthor[]>(
          BLOG_TAG_AUTHORS_FACET_QUERY,
          blogLanguageParams({ tagSlug }),
        )
        .catch(() => []),
    ]);
  }

  return {
    tag,
    posts,
    totalCount,
    pageNumber,
    totalPages,
    filters,
    cooccurringTags,
    authors,
  };
}

export function parseTagPageFromSearchParams(searchParams: SearchParams): number {
  return parseListingPage(searchParams);
}

export {
  parseArchivePageParam,
  isArchivePageOutOfRange,
  getBlogRobotsDirective,
  hasListingFilters,
  type BlogRobotsDirective,
};
