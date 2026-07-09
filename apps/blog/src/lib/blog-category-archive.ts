import type { Metadata } from "next";
import type { PortableTextBlock } from "@portabletext/types";
import type { HomePostCard } from "@/lib/blog-home";
import { getCategoryFallback } from "@/lib/blog-categories";
import {
  LISTING_PAGE_SIZE,
  parseArchivePageParam,
} from "@/lib/blog-archive";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import {
  getBlogRobotsDirective,
  hasListingFilters,
  parseListingPage,
  type BlogRobotsDirective,
} from "@/lib/seo";
import { blogLanguageParams } from "@/lib/blog-language";
import { getSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_CATEGORY_AUTHORS_FACET_QUERY,
  BLOG_CATEGORY_BY_SLUG_QUERY,
  BLOG_CATEGORY_FEATURED_POSTS_QUERY,
  BLOG_CATEGORY_POSTS_COUNT_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_NEWEST_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_OLDEST_QUERY,
  BLOG_CATEGORY_POSTS_PAGE_TITLE_QUERY,
  BLOG_CATEGORY_RECOMMENDED_TOPICS_QUERY,
  BLOG_CATEGORY_TAGS_FACET_QUERY,
} from "@pakfactory/sanity/queries";
import type { TopicGroupRef } from "@/lib/tag-groups";

export type CategorySort = "newest" | "oldest" | "title";

export type CategoryDocument = DocSeoFields & {
  _id?: string;
  title: string;
  slug: string;
  description?: PortableTextBlock[];
  descriptionText?: string;
  bannerImageUrl?: string;
};

export type CategoryFacetTag = {
  _id?: string;
  title: string;
  slug: string;
  topicGroup?: TopicGroupRef;
};
export type CategoryFacetAuthor = { _id?: string; name: string; slug: string };
/** A recommended-topic chip — a `blogTag` surfaced from the freshest post. */
export type CategoryTopic = { _id?: string; title: string; slug: string };

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
  featuredPosts: HomePostCard[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  perPage: number;
  filters: CategoryListFilters;
  tags: CategoryFacetTag[];
  authors: CategoryFacetAuthor[];
  /** Chips for the recommended-topics row (page 1); [] on deeper pages. */
  recommendedTopics: CategoryTopic[];
};

export const PAGE_SIZE_OPTIONS = [15, 30, 50] as const;
export const DEFAULT_PAGE_SIZE = LISTING_PAGE_SIZE;

export function parsePerPage(raw: string | string[] | undefined): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(str ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

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

function hasActiveCategoryFilters(filters: CategoryListFilters): boolean {
  return Boolean(
    filters.tag || filters.author || filters.year || filters.month,
  );
}

function groqFilterParams(
  categorySlug: string,
  filters: CategoryListFilters,
  options?: { excludeFeatured?: boolean },
) {
  const { yearStart, yearEnd } = yearMonthBounds(filters.year, filters.month);
  return blogLanguageParams({
    categorySlug,
    tagSlug: filters.tag ?? null,
    authorSlug: filters.author ?? null,
    yearStart,
    yearEnd,
    excludeFeatured: options?.excludeFeatured ?? false,
  });
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
  perPage?: number,
): string {
  const params = new URLSearchParams();
  if (pageNumber > 1) params.set("page", String(pageNumber));
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.author) params.set("author", filters.author);
  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (perPage && perPage !== DEFAULT_PAGE_SIZE) params.set("perPage", String(perPage));
  const qs = params.toString();
  return qs ? `/${categorySlug}?${qs}` : `/${categorySlug}`;
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

export async function buildCategoryArchiveMetadata(
  category: CategoryDocument,
  selfCanonicalPath: string,
  robots: BlogRobotsDirective,
  options?: { titleOverride?: string; descriptionOverride?: string },
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "categoryDefaults");
  return buildDocMetadata({
    title: category.title,
    descriptionFallback:
      category.descriptionText?.trim() ||
      `Browse ${category.title} articles on PakFactory Blog.`,
    featuredImageUrl: category.bannerImageUrl || category.ogImageUrl,
    selfCanonicalPath,
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: category,
    robots,
    titleOverride: options?.titleOverride,
    descriptionOverride: options?.descriptionOverride,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      name: category.title,
      description: category.descriptionText,
      sitename: ctx.siteName,
    },
  });
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<CategoryDocument | null> {
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

  const client = await getSanityClient();
  const doc = await client
    .fetch<CategoryDocument | null>(
      BLOG_CATEGORY_BY_SLUG_QUERY,
      blogLanguageParams({ slug }),
    )
    .catch(() => null);

  if (doc?.slug) return doc;
  if (fallback) {
    return { title: fallback.title, slug: fallback.slug, descriptionText: "" };
  }
  return null;
}

export async function fetchCategoryArchivePage(
  categorySlug: string,
  pageNumber: number,
  filters: CategoryListFilters,
  perPage: number = DEFAULT_PAGE_SIZE,
): Promise<CategoryArchivePageData | null> {
  const category = await fetchCategoryBySlug(categorySlug);
  if (!category) return null;

  const excludeFeatured =
    pageNumber === 1 && !hasActiveCategoryFilters(filters);
  const groqParams = groqFilterParams(categorySlug, filters, {
    excludeFeatured,
  });
  let totalCount = 0;
  let featuredPosts: HomePostCard[] = [];
  let recommendedTopics: CategoryTopic[] = [];

  if (isSanityConfigured()) {
    const client = await getSanityClient();
    // Featured band + recommended-topics row are page-1-only sections.
    const wantsPageOneExtras = pageNumber === 1;
    [totalCount, featuredPosts, recommendedTopics] = await Promise.all([
      client
        .fetch<number>(BLOG_CATEGORY_POSTS_COUNT_QUERY, groqParams)
        .catch(() => 0),
      excludeFeatured
        ? client
            .fetch<HomePostCard[]>(
              BLOG_CATEGORY_FEATURED_POSTS_QUERY,
              blogLanguageParams({ categorySlug }),
            )
            .catch(() => [])
        : Promise.resolve([] as HomePostCard[]),
      wantsPageOneExtras
        ? client
            .fetch<CategoryTopic[] | null>(
              BLOG_CATEGORY_RECOMMENDED_TOPICS_QUERY,
              blogLanguageParams({ categorySlug }),
            )
            .then((topics) => topics ?? [])
            .catch(() => [])
        : Promise.resolve([] as CategoryTopic[]),
    ]);
  }

  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / perPage);
  const isOutOfRange = pageNumber < 1 || pageNumber > totalPages;

  if (isOutOfRange) {
    return {
      category,
      posts: [],
      featuredPosts,
      totalCount,
      pageNumber,
      totalPages,
      perPage,
      filters,
      tags: [],
      authors: [],
      recommendedTopics,
    };
  }

  let posts: HomePostCard[] = [];
  let tags: CategoryFacetTag[] = [];
  let authors: CategoryFacetAuthor[] = [];

  if (isSanityConfigured()) {
    const start = (pageNumber - 1) * perPage;
    const end = start + perPage;
    const client = await getSanityClient();
    [posts, tags, authors] = await Promise.all([
      client
        .fetch<HomePostCard[]>(postsPageQuery(filters.sort), {
          ...groqParams,
          start,
          end,
        })
        .catch(() => []),
      client
        .fetch<CategoryFacetTag[]>(
          BLOG_CATEGORY_TAGS_FACET_QUERY,
          blogLanguageParams({ categorySlug }),
        )
        .catch(() => []),
      client
        .fetch<CategoryFacetAuthor[]>(
          BLOG_CATEGORY_AUTHORS_FACET_QUERY,
          blogLanguageParams({ categorySlug }),
        )
        .catch(() => []),
    ]);
  }

  return {
    category,
    posts,
    featuredPosts,
    totalCount,
    pageNumber,
    totalPages,
    perPage,
    filters,
    tags,
    authors,
    recommendedTopics,
  };
}

export function parseCategoryPageFromSearchParams(
  searchParams: SearchParams,
): number {
  return parseListingPage(searchParams);
}

export { parseArchivePageParam };
