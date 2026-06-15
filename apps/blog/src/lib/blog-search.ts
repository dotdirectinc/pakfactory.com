import type { HomePostCard } from "@/lib/blog-home";
import {
  archivePageSlice,
  getTotalArchivePages,
  isArchivePageOutOfRange,
} from "@/lib/blog-archive";
import { parseListingPage, type BlogRobotsDirective } from "@/lib/seo";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_SEARCH_POSTS_COUNT_QUERY,
  BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY,
  BLOG_SEARCH_POSTS_PAGE_OLDEST_QUERY,
  BLOG_SEARCH_POSTS_PAGE_RELEVANCE_QUERY,
  BLOG_SEARCH_POSTS_PAGE_TITLE_QUERY,
} from "@pakfactory/sanity/queries";

/** Relevance is the default; the sidebar can re-sort. */
export type SearchSort = "relevance" | "newest" | "oldest" | "title";

export type SearchListFilters = {
  year?: string;
  month?: string;
  sort: SearchSort;
};

export type SearchPageData = {
  /** Raw user query (trimmed), echoed into the input + result count. */
  query: string;
  /** Tokenized GROQ term; null when the query is empty (→ empty state). */
  searchTerm: string | null;
  posts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  filters: SearchListFilters;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function parseSearchQuery(searchParams: SearchParams): string {
  return firstParam(searchParams.q)?.trim() ?? "";
}

export function parseSearchSort(raw: string | undefined): SearchSort {
  if (raw === "newest" || raw === "oldest" || raw === "title") return raw;
  return "relevance";
}

export function parseSearchFilters(searchParams: SearchParams): SearchListFilters {
  return {
    year: firstParam(searchParams.year)?.trim() || undefined,
    month: firstParam(searchParams.month)?.trim() || undefined,
    sort: parseSearchSort(firstParam(searchParams.sort)),
  };
}

export function parseSearchPage(searchParams: SearchParams): number {
  return parseListingPage(searchParams);
}

/**
 * Tokenize the user query for Sanity `match`: strip GROQ-significant
 * punctuation, then suffix each token with `*` for prefix matching.
 * Returns null for an empty query (caller renders the empty state).
 */
export function buildSearchTerm(query: string): string | null {
  const cleaned = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `${token}*`).join(" ");
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

function searchPageQuery(sort: SearchSort): string {
  switch (sort) {
    case "newest":
      return BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY;
    case "oldest":
      return BLOG_SEARCH_POSTS_PAGE_OLDEST_QUERY;
    case "title":
      return BLOG_SEARCH_POSTS_PAGE_TITLE_QUERY;
    default:
      return BLOG_SEARCH_POSTS_PAGE_RELEVANCE_QUERY;
  }
}

/**
 * Build a `/search` URL. `q` and active filters are query params; relevance
 * sort and page 1 are omitted (defaults).
 */
export function searchPageHref(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Search pages are never indexed, but links are still followed (PROD-1503 AC). */
export function getSearchRobots(): BlogRobotsDirective {
  return { index: false, follow: true };
}

export async function fetchSearchPage(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
): Promise<SearchPageData> {
  const searchTerm = buildSearchTerm(query);
  const base = {
    query,
    searchTerm,
    pageNumber,
    filters,
  };

  if (!searchTerm) {
    return { ...base, posts: [], totalCount: 0, totalPages: 1 };
  }

  const { yearStart, yearEnd } = yearMonthBounds(filters.year, filters.month);
  const groqParams = blogLanguageParams({ searchTerm, yearStart, yearEnd });

  let totalCount = 0;
  if (isSanityConfigured()) {
    totalCount = await getSanityClient()
      .fetch<number>(BLOG_SEARCH_POSTS_COUNT_QUERY, groqParams)
      .catch(() => 0);
  }

  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return { ...base, posts: [], totalCount, totalPages };
  }

  let posts: HomePostCard[] = [];
  if (isSanityConfigured()) {
    const { start, end } = archivePageSlice(pageNumber);
    posts = await getSanityClient()
      .fetch<HomePostCard[]>(searchPageQuery(filters.sort), {
        ...groqParams,
        start,
        end,
      })
      .catch(() => []);
  }

  return { ...base, posts, totalCount, totalPages };
}
