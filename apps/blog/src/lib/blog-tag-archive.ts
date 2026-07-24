import type { Metadata } from "next";
import type { HomePostCard } from "@/lib/blog-home";
import {
  DEFAULT_PAGE_SIZE,
  getTotalArchivePages,
  isArchivePageOutOfRange,
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
import { blogCachedFetch } from "@/lib/blog-cached-fetch";
import {
  BLOG_POSTS_CACHE_TAG,
  BLOG_TOPIC_CACHE_TAG,
  blogTopicTag,
} from "@/lib/blog-cache";
import { blogLanguageParams } from "@/lib/blog-language";
import { toPostCardData } from "@/lib/post-card-data";
import {
  resolveListingPage,
  type ListingPost,
} from "@/lib/listing-posts";
import {
  type TagListFilters,
  type TagSort,
} from "@/lib/blog-tag-url";
import {
  BLOG_TAG_ALL_POSTS_QUERY,
  BLOG_TAG_AUTHORS_FACET_QUERY,
  BLOG_TAG_BY_SLUG_QUERY,
  BLOG_TAG_COOCCURRING_TAGS_QUERY,
} from "@pakfactory/sanity/queries";
import type { TopicGroupRef } from "@/lib/tag-groups";

export type { TagListFilters, TagSort };
export { parseTagFilters, parseTagSort, tagPageHref } from "@/lib/blog-tag-url";

export type TagDocument = DocSeoFields & {
  _id?: string;
  title: string;
  slug: string;
  descriptionText?: string;
  topicGroup?: TopicGroupRef;
};

export type TagFacet = {
  _id?: string;
  title: string;
  slug: string;
  topicGroup?: TopicGroupRef;
};
export type TagFacetAuthor = { _id?: string; name: string; slug: string };

export type TagArchivePageData = {
  tag: TagDocument;
  /** Full unfiltered topic set — client filter/sort/paginate from this. */
  allPosts: ListingPost[];
  /** SSR/crawler page slice matching the current URL. */
  posts: ListingPost[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
  perPage: number;
  filters: TagListFilters;
  cooccurringTags: TagFacet[];
  authors: TagFacetAuthor[];
};

type TagAllPostRow = HomePostCard & {
  sortUpdatedAt?: string;
  viewCount?: number;
};

function toTopicListingPost(row: TagAllPostRow): ListingPost {
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

export async function buildTagArchiveMetadata(
  tag: TagDocument,
  selfCanonicalPath: string,
  robots: BlogRobotsDirective,
  options?: { titleOverride?: string; descriptionOverride?: string },
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "tagDefaults");
  return buildDocMetadata({
    title: tag.title,
    descriptionFallback:
      tag.descriptionText?.trim() ||
      `Browse articles tagged ${tag.title} on PakFactory Blog.`,
    featuredImageUrl: tag.ogImageUrl,
    selfCanonicalPath,
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: tag,
    robots,
    titleOverride: options?.titleOverride,
    descriptionOverride: options?.descriptionOverride,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      name: tag.title,
      description: tag.descriptionText,
      sitename: ctx.siteName,
    },
  });
}

export async function fetchTagBySlug(slug: string): Promise<TagDocument | null> {
  const doc = await blogCachedFetch<TagDocument | null>({
    cacheKey: "tag-by-slug",
    query: BLOG_TAG_BY_SLUG_QUERY,
    params: blogLanguageParams({ slug }),
    tags: [BLOG_TOPIC_CACHE_TAG, blogTopicTag(slug)],
    fallback: null,
    label: `topic:${slug}`,
  });
  return doc?.slug ? doc : null;
}

/**
 * Topic archive dataset: one Sanity wave loads the tag doc, the full post set
 * (unfiltered), and facets. Category/sort/page are applied in memory so the
 * listing island can update cards instantly without another round-trip.
 */
export async function fetchTagArchivePage(
  tagSlug: string,
  pageNumber: number,
  filters: TagListFilters,
  perPage: number = DEFAULT_PAGE_SIZE,
): Promise<TagArchivePageData | null> {
  let tag: TagDocument | null = null;
  let rows: TagAllPostRow[] = [];
  let cooccurringTags: TagFacet[] = [];
  let authors: TagFacetAuthor[] = [];

  [tag, rows, cooccurringTags, authors] = await Promise.all([
    fetchTagBySlug(tagSlug),
    blogCachedFetch<TagAllPostRow[]>({
      cacheKey: "tag-all-posts",
      query: BLOG_TAG_ALL_POSTS_QUERY,
      params: blogLanguageParams({ tagSlug }),
      tags: [BLOG_POSTS_CACHE_TAG, blogTopicTag(tagSlug)],
      fallback: [],
      label: `topic-posts:${tagSlug}`,
    }),
    blogCachedFetch<TagFacet[]>({
      cacheKey: "tag-cooccurring",
      query: BLOG_TAG_COOCCURRING_TAGS_QUERY,
      params: blogLanguageParams({ tagSlug }),
      tags: [BLOG_TOPIC_CACHE_TAG, BLOG_POSTS_CACHE_TAG],
      fallback: [],
      label: `topic-cooccurring:${tagSlug}`,
    }),
    blogCachedFetch<TagFacetAuthor[]>({
      cacheKey: "tag-authors-facet",
      query: BLOG_TAG_AUTHORS_FACET_QUERY,
      params: blogLanguageParams({ tagSlug }),
      tags: [BLOG_POSTS_CACHE_TAG, blogTopicTag(tagSlug)],
      fallback: [],
      label: `topic-authors:${tagSlug}`,
    }),
  ]);

  if (!tag) return null;

  const allPosts = rows.map(toTopicListingPost);
  const { pagePosts, totalCount, totalPages, isOutOfRange } =
    resolveListingPage(allPosts, filters, pageNumber, perPage);

  if (isOutOfRange) {
    return {
      tag,
      allPosts,
      posts: [],
      totalCount,
      pageNumber,
      totalPages,
      perPage,
      filters,
      cooccurringTags: [],
      authors: [],
    };
  }

  return {
    tag,
    allPosts,
    posts: pagePosts,
    totalCount,
    pageNumber,
    totalPages,
    perPage,
    filters,
    cooccurringTags,
    authors,
  };
}

export function parseTagPageFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): number {
  return parseListingPage(searchParams);
}

export {
  parseArchivePageParam,
  isArchivePageOutOfRange,
  getBlogRobotsDirective,
  hasListingFilters,
  getTotalArchivePages,
  type BlogRobotsDirective,
};
