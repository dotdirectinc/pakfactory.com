import type { Metadata } from "next";
import type { HomePostCard } from "@/lib/blog-home";
import type { BlogSearchContent } from "@/lib/blog-data";
import {
  archivePageSlice,
  DEFAULT_PAGE_SIZE,
  getTotalArchivePages,
  isArchivePageOutOfRange,
} from "@/lib/blog-archive";
import { parseListingPage, type BlogRobotsDirective } from "@/lib/seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import { buildDocMetadata } from "@/lib/resolve-seo";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_SEARCH_POSTS_COUNT_QUERY,
  BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY,
  BLOG_SEARCH_POSTS_PAGE_POPULAR_QUERY,
  BLOG_SEARCH_POSTS_PAGE_UPDATED_QUERY,
} from "@pakfactory/sanity/queries";

const SEARCH_TITLE_FALLBACK = "Search";
const SEARCH_META_TITLE_FALLBACK = "Search | PakFactory Blog";
const SEARCH_DESCRIPTION_FALLBACK =
  "Search the PakFactory blog for custom packaging guides on design, materials, sustainability, compliance, cost, and branding.";

/** Newest (date posted) is the default; the filter bar can re-sort. */
export type SearchSort = "newest" | "updated" | "popular";

export type SearchListFilters = {
  /** Selected category slugs (empty = all). Wired to the URL as repeated `?category=`. */
  categories: string[];
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
  perPage: number;
  filters: SearchListFilters;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Collect a repeated/comma-separated query param into a de-duped, trimmed list. */
function paramList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  const values = raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

export function parseSearchQuery(searchParams: SearchParams): string {
  return firstParam(searchParams.q)?.trim() ?? "";
}

export function parseSearchSort(raw: string | undefined): SearchSort {
  if (raw === "updated" || raw === "popular") return raw;
  return "newest";
}

export function parseSearchFilters(searchParams: SearchParams): SearchListFilters {
  return {
    categories: paramList(searchParams.category),
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

function searchPageQuery(sort: SearchSort): string {
  switch (sort) {
    case "updated":
      return BLOG_SEARCH_POSTS_PAGE_UPDATED_QUERY;
    case "popular":
      return BLOG_SEARCH_POSTS_PAGE_POPULAR_QUERY;
    default:
      return BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY;
  }
}

/**
 * Search listings use GROQ + `POST_CARD_FIELDS` (same strategy as category
 * archives) so cards get authorSlug + readingTimeMinutes. Algolia is reserved
 * for nav typeahead (`algolia-suggest.ts`), not the `/search` results grid.
 */
async function fetchSearchPageFromGroq(
  searchTerm: string,
  pageNumber: number,
  filters: SearchListFilters,
  perPage: number,
): Promise<{ posts: HomePostCard[]; totalCount: number }> {
  const groqParams = blogLanguageParams({
    searchTerm,
    categorySlugs: filters.categories,
    yearStart: null,
    yearEnd: null,
  });

  let totalCount = 0;
  if (isSanityConfigured()) {
    const client = await getSanityClient();
    totalCount = await client
      .fetch<number>(BLOG_SEARCH_POSTS_COUNT_QUERY, groqParams)
      .catch(() => 0);
  }

  let posts: HomePostCard[] = [];
  if (
    isSanityConfigured() &&
    !isArchivePageOutOfRange(pageNumber, totalCount, perPage)
  ) {
    const { start, end } = archivePageSlice(pageNumber, perPage);
    const client = await getSanityClient();
    posts = await client
      .fetch<HomePostCard[]>(searchPageQuery(filters.sort), {
        ...groqParams,
        start,
        end,
      })
      .catch(() => []);
  }

  return { posts, totalCount };
}

/**
 * Build a `/search` URL. `q` and active filters are query params; newest
 * sort and page 1 are omitted (defaults). Categories serialize as repeated
 * `?category=` params.
 */
export function searchPageHref(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
  perPage?: number,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  for (const slug of filters.categories) params.append("category", slug);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (perPage && perPage !== DEFAULT_PAGE_SIZE) {
    params.set("perPage", String(perPage));
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Search pages are never indexed, but links are still followed (PROD-1503 AC). */
export function getSearchRobots(): BlogRobotsDirective {
  return { index: false, follow: true };
}

/**
 * Search metadata: empty state uses CMS SEO + Blog Settings pageDefaults;
 * results (`?q=`) keep a query-specific title/description. Always noindex.
 */
export async function buildBlogSearchMetadata(
  query: string,
  page: BlogSearchContent | null,
): Promise<Metadata> {
  const robots = getSearchRobots();

  if (query) {
    return buildDocMetadata({
      title: `Search results for “${query}”`,
      descriptionFallback: `Blog articles matching “${query}”.`,
      selfCanonicalPath: "/search",
      seo: {},
      robots,
      titleOverride: `Search results for “${query}” | PakFactory Blog`,
    });
  }

  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");
  const pageTitle = page?.title?.trim() || SEARCH_TITLE_FALLBACK;
  const {
    topics: _topics,
    blocks: _blocks,
    ...seo
  } = page ?? { topics: [], blocks: [] };

  return buildDocMetadata({
    title: pageTitle,
    descriptionFallback: SEARCH_DESCRIPTION_FALLBACK,
    featuredImageUrl: page?.ogImageUrl,
    selfCanonicalPath: "/search",
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo,
    robots,
    titleOverride:
      page?.metaTitle?.trim() || defaults?.metaTitleFormat?.trim()
        ? undefined
        : SEARCH_META_TITLE_FALLBACK,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: pageTitle,
      description: page?.description,
      sitename: ctx.siteName,
    },
  });
}

export async function fetchSearchPage(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
  perPage: number = DEFAULT_PAGE_SIZE,
): Promise<SearchPageData> {
  const searchTerm = buildSearchTerm(query);
  const base = {
    query,
    searchTerm,
    pageNumber,
    perPage,
    filters,
  };

  if (!searchTerm) {
    return { ...base, posts: [], totalCount: 0, totalPages: 1 };
  }

  const { posts, totalCount } = await fetchSearchPageFromGroq(
    searchTerm,
    pageNumber,
    filters,
    perPage,
  );

  const totalPages = getTotalArchivePages(totalCount, perPage);

  if (isArchivePageOutOfRange(pageNumber, totalCount, perPage)) {
    return { ...base, posts: [], totalCount, totalPages };
  }

  return { ...base, posts, totalCount, totalPages };
}
