import type { Metadata } from "next";
import type { HomePostCard } from "@/lib/blog-home";
import type { BlogSearchContent } from "@/lib/blog-data";
import { DEFAULT_PAGE_SIZE } from "@/lib/blog-archive";
import type { BlogRobotsDirective } from "@/lib/seo";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import { buildDocMetadata } from "@/lib/resolve-seo";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { toPostCardData } from "@/lib/post-card-data";
import {
  resolveListingPage,
  type ListingPost,
} from "@/lib/listing-posts";
import {
  parseSearchFilters,
  parseSearchPage,
  parseSearchQuery,
  searchPageHref,
  type SearchListFilters,
  type SearchSort,
} from "@/lib/blog-search-url";
import { BLOG_SEARCH_ALL_POSTS_QUERY } from "@pakfactory/sanity/queries";

const SEARCH_TITLE_FALLBACK = "Search";
const SEARCH_META_TITLE_FALLBACK = "Search | PakFactory Blog";
const SEARCH_DESCRIPTION_FALLBACK =
  "Search the PakFactory blog for custom packaging guides on design, materials, sustainability, compliance, cost, and branding.";

export type { SearchListFilters, SearchSort };
export {
  parseSearchFilters,
  parseSearchPage,
  parseSearchQuery,
  searchPageHref,
} from "@/lib/blog-search-url";

export type SearchPageData = {
  /** Raw user query (trimmed), echoed into the input + result count. */
  query: string;
  /** Tokenized GROQ term; null when the query is empty (→ empty state). */
  searchTerm: string | null;
  /** Full match set (capped) for client-side filter/sort/paginate. */
  allPosts: ListingPost[];
  /** SSR/crawler page slice matching the current URL. */
  posts: ListingPost[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  perPage: number;
  filters: SearchListFilters;
};

type SearchAllPostRow = HomePostCard & {
  sortUpdatedAt?: string;
  viewCount?: number;
};

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

function toListingPost(row: SearchAllPostRow): ListingPost {
  const card = toPostCardData(row);
  return {
    ...card,
    slug: row.slug,
    sortUpdatedAt: row.sortUpdatedAt || row.publishedAt || "",
    viewCount:
      typeof row.viewCount === "number" && Number.isFinite(row.viewCount)
        ? row.viewCount
        : 0,
  };
}

/**
 * Load all matches for `searchTerm` (text only — category/sort apply in-browser).
 * Caps at 500 newest via the GROQ slice.
 */
async function fetchSearchAllPosts(searchTerm: string): Promise<ListingPost[]> {
  if (!isSanityConfigured()) return [];
  const client = await getSanityClient();
  const rows = await client
    .fetch<SearchAllPostRow[]>(
      BLOG_SEARCH_ALL_POSTS_QUERY,
      blogLanguageParams({ searchTerm }),
    )
    .catch(() => []);
  return rows.map(toListingPost);
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

/**
 * Search dataset: one Sanity fetch for all matches of `q`, then category/sort/
 * page applied in memory (same pattern as topic archives).
 */
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
    return {
      ...base,
      allPosts: [],
      posts: [],
      totalCount: 0,
      totalPages: 1,
    };
  }

  const allPosts = await fetchSearchAllPosts(searchTerm);
  const { pagePosts, totalCount, totalPages, isOutOfRange } =
    resolveListingPage(allPosts, filters, pageNumber, perPage);

  if (isOutOfRange) {
    return { ...base, allPosts, posts: [], totalCount, totalPages };
  }

  return {
    ...base,
    allPosts,
    posts: pagePosts,
    totalCount,
    totalPages,
  };
}
