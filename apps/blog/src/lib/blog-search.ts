import type { HomePostCard } from "@/lib/blog-home";
import {
  archivePageSlice,
  getTotalArchivePages,
  isArchivePageOutOfRange,
  LISTING_PAGE_SIZE,
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
import {
  ALGOLIA_SORT_INDEX,
  type AlgoliaPostRecord,
} from "@pakfactory/sanity/algolia/post-record";
import { liteClient } from "algoliasearch/lite";

/** Relevance is the default; the sidebar can re-sort. */
export type SearchSort = "relevance" | "newest" | "oldest" | "title";

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
  filters: SearchListFilters;
};

type SearchParams = Record<string, string | string[] | undefined>;

const useAlgolia =
  Boolean(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID) &&
  Boolean(process.env.NEXT_PUBLIC_ALGOLIA_API_KEY);

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
  if (raw === "newest" || raw === "oldest" || raw === "title") return raw;
  return "relevance";
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

function algoliaHitToHomePostCard(hit: AlgoliaPostRecord): HomePostCard {
  return {
    _id: hit.objectID,
    title: hit.title,
    slug: hit.slug,
    excerpt: hit.excerpt || undefined,
    publishedAt: hit.publishedAt ?? undefined,
    mainImage: hit.image
      ? { url: hit.image, alt: hit.imageAlt || undefined }
      : undefined,
    categorySlug: hit.category?.slug ?? undefined,
    categoryTitle: hit.category?.title ?? undefined,
    authorName: hit.author?.name ?? undefined,
  };
}

function buildAlgoliaFacetFilters(categories: string[]): string[][] | undefined {
  if (categories.length === 0) return undefined;
  return [categories.map((slug) => `category.slug:${slug}`)];
}

async function fetchSearchPageFromAlgolia(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
): Promise<{ posts: HomePostCard[]; totalCount: number }> {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!;
  const client = liteClient(appId, apiKey);
  const facetFilters = buildAlgoliaFacetFilters(filters.categories);

  const { results } = await client.searchForHits<AlgoliaPostRecord>({
    requests: [
      {
        indexName: ALGOLIA_SORT_INDEX[filters.sort],
        query,
        page: Math.max(0, pageNumber - 1),
        hitsPerPage: LISTING_PAGE_SIZE,
        ...(facetFilters ? { facetFilters } : {}),
      },
    ],
  });

  const result = results[0];
  const hits = result?.hits ?? [];
  return {
    posts: hits.map(algoliaHitToHomePostCard),
    totalCount: result?.nbHits ?? 0,
  };
}

async function fetchSearchPageFromGroq(
  searchTerm: string,
  pageNumber: number,
  filters: SearchListFilters,
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
  if (isSanityConfigured() && !isArchivePageOutOfRange(pageNumber, totalCount)) {
    const { start, end } = archivePageSlice(pageNumber);
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
 * Build a `/search` URL. `q` and active filters are query params; relevance
 * sort and page 1 are omitted (defaults). Categories serialize as repeated
 * `?category=` params.
 */
export function searchPageHref(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  for (const slug of filters.categories) params.append("category", slug);
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

  let posts: HomePostCard[] = [];
  let totalCount = 0;

  if (useAlgolia) {
    try {
      const algoliaResult = await fetchSearchPageFromAlgolia(
        query,
        pageNumber,
        filters,
      );
      posts = algoliaResult.posts;
      totalCount = algoliaResult.totalCount;
    } catch (error) {
      console.error("[blog-search] Algolia search failed, falling back to GROQ:", error);
      const groqResult = await fetchSearchPageFromGroq(
        searchTerm,
        pageNumber,
        filters,
      );
      posts = groqResult.posts;
      totalCount = groqResult.totalCount;
    }
  } else {
    const groqResult = await fetchSearchPageFromGroq(
      searchTerm,
      pageNumber,
      filters,
    );
    posts = groqResult.posts;
    totalCount = groqResult.totalCount;
  }

  const totalPages = getTotalArchivePages(totalCount);

  if (isArchivePageOutOfRange(pageNumber, totalCount)) {
    return { ...base, posts: [], totalCount, totalPages };
  }

  return { ...base, posts, totalCount, totalPages };
}
