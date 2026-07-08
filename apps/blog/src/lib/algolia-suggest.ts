"use client";

import {
  ALGOLIA_SORT_INDEX,
  type AlgoliaPostRecord,
} from "@pakfactory/sanity/algolia/post-record";
import { categoryHref, postDetailHref, tagHref } from "@/lib/blog-post-url";
import { liteClient } from "algoliasearch/lite";

export type SearchSuggestKind = "post" | "category" | "topic";
export type SearchSuggestTab = "all" | "posts" | "categories" | "topics";

export type SearchSuggestion = {
  id: string;
  kind: SearchSuggestKind;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  href: string;
};

export type SearchSuggestBundle = {
  items: SearchSuggestion[];
  counts: Record<SearchSuggestTab, number>;
};

const DEFAULT_POST_LIMIT = 6;
const DEDUPE_SCAN_LIMIT = 20;
const ALL_POST_LIMIT = 3;
const ALL_CATEGORY_LIMIT = 2;
const ALL_TOPIC_LIMIT = 2;
const MIN_QUERY_LENGTH = 2;

const POST_RETRIEVE = [
  "objectID",
  "title",
  "slug",
  "category",
  "tags",
  "image",
  "imageAlt",
] as const;

const EMPTY_COUNTS: Record<SearchSuggestTab, number> = {
  all: 0,
  posts: 0,
  categories: 0,
  topics: 0,
};

let algoliaClient: ReturnType<typeof liteClient> | null = null;

export function isAlgoliaSuggestEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
      process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
  );
}

function getAlgoliaClient(): ReturnType<typeof liteClient> | null {
  if (!isAlgoliaSuggestEnabled()) return null;
  if (!algoliaClient) {
    algoliaClient = liteClient(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!,
    );
  }
  return algoliaClient;
}

function hitToPostSuggestion(hit: AlgoliaPostRecord): SearchSuggestion {
  return {
    id: hit.objectID,
    kind: "post",
    title: hit.title,
    subtitle: hit.category?.title ?? undefined,
    imageUrl: hit.image ?? undefined,
    imageAlt: hit.imageAlt || undefined,
    href: postDetailHref(hit.slug),
  };
}

function categoriesFromHits(
  hits: AlgoliaPostRecord[],
  limit: number,
): SearchSuggestion[] {
  const seen = new Set<string>();
  const items: SearchSuggestion[] = [];

  for (const hit of hits) {
    const slug = hit.category?.slug;
    const title = hit.category?.title;
    if (!slug || !title || seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      id: `category:${slug}`,
      kind: "category",
      title,
      subtitle: "Category",
      href: categoryHref(slug),
    });
    if (items.length >= limit) break;
  }

  return items;
}

function topicsFromHits(
  hits: AlgoliaPostRecord[],
  query: string,
  limit: number,
): SearchSuggestion[] {
  const needle = query.toLowerCase();
  const seen = new Set<string>();
  const items: SearchSuggestion[] = [];

  for (const hit of hits) {
    for (const tag of hit.tags ?? []) {
      const slug = tag?.slug;
      const title = tag?.title;
      if (!slug || !title || seen.has(slug)) continue;
      if (!title.toLowerCase().includes(needle)) continue;
      seen.add(slug);
      items.push({
        id: `topic:${slug}`,
        kind: "topic",
        title,
        subtitle: "Topic",
        href: tagHref(slug),
      });
      if (items.length >= limit) break;
    }
    if (items.length >= limit) break;
  }

  return items;
}

function buildCounts(
  postNbHits: number,
  categoryHits: AlgoliaPostRecord[],
  topicHits: AlgoliaPostRecord[],
  query: string,
): Record<SearchSuggestTab, number> {
  const categoryCount = categoriesFromHits(
    categoryHits,
    DEDUPE_SCAN_LIMIT,
  ).length;
  const topicCount = topicsFromHits(topicHits, query, DEDUPE_SCAN_LIMIT).length;

  return {
    posts: postNbHits,
    categories: categoryCount,
    topics: topicCount,
    all: postNbHits + categoryCount + topicCount,
  };
}

function itemsForTab(
  tab: SearchSuggestTab,
  postHits: AlgoliaPostRecord[],
  categoryHits: AlgoliaPostRecord[],
  topicHits: AlgoliaPostRecord[],
  query: string,
  postLimit: number,
): SearchSuggestion[] {
  const posts = postHits.map(hitToPostSuggestion);
  const categories = categoriesFromHits(categoryHits, postLimit);
  const topics = topicsFromHits(topicHits, query, postLimit);

  switch (tab) {
    case "posts":
      return posts.slice(0, postLimit);
    case "categories":
      return categories;
    case "topics":
      return topics;
    case "all":
    default:
      return [
        ...posts.slice(0, ALL_POST_LIMIT),
        ...categories.slice(0, ALL_CATEGORY_LIMIT),
        ...topics.slice(0, ALL_TOPIC_LIMIT),
      ];
  }
}

export async function fetchSearchSuggestBundle(
  query: string,
  tab: SearchSuggestTab = "all",
  postLimit = DEFAULT_POST_LIMIT,
): Promise<SearchSuggestBundle> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { items: [], counts: { ...EMPTY_COUNTS } };
  }

  const client = getAlgoliaClient();
  if (!client) {
    return { items: [], counts: { ...EMPTY_COUNTS } };
  }

  const indexName = ALGOLIA_SORT_INDEX.relevance;
  const postHitsPerPage = Math.max(postLimit, ALL_POST_LIMIT, DEDUPE_SCAN_LIMIT);

  try {
    const { results } = await client.searchForHits<AlgoliaPostRecord>({
      requests: [
        {
          indexName,
          query: trimmed,
          hitsPerPage: postHitsPerPage,
          attributesToRetrieve: [...POST_RETRIEVE],
        },
        {
          indexName,
          query: trimmed,
          hitsPerPage: DEDUPE_SCAN_LIMIT,
          restrictSearchableAttributes: ["category.title"],
          attributesToRetrieve: [...POST_RETRIEVE],
        },
        {
          indexName,
          query: trimmed,
          hitsPerPage: DEDUPE_SCAN_LIMIT,
          restrictSearchableAttributes: ["tags.title"],
          attributesToRetrieve: [...POST_RETRIEVE],
        },
      ],
    });

    const postResult = results[0];
    const categoryResult = results[1];
    const topicResult = results[2];

    const postHits = postResult?.hits ?? [];
    const categoryHits = categoryResult?.hits ?? [];
    const topicHits = topicResult?.hits ?? [];

    return {
      items: itemsForTab(
        tab,
        postHits,
        categoryHits,
        topicHits,
        trimmed,
        postLimit,
      ),
      counts: buildCounts(
        postResult?.nbHits ?? postHits.length,
        categoryHits,
        topicHits,
        trimmed,
      ),
    };
  } catch (error) {
    console.error("[algolia-suggest] fetch failed:", error);
    return { items: [], counts: { ...EMPTY_COUNTS } };
  }
}

/** @deprecated Use fetchSearchSuggestBundle — kept for compatibility. */
export async function fetchSearchSuggestions(
  query: string,
  limit = DEFAULT_POST_LIMIT,
): Promise<SearchSuggestion[]> {
  const bundle = await fetchSearchSuggestBundle(query, "posts", limit);
  return bundle.items;
}

export const SEARCH_SUGGEST_TABS: {
  id: SearchSuggestTab;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "posts", label: "Posts" },
  { id: "categories", label: "Categories" },
  { id: "topics", label: "Topics" },
];

export const SEARCH_SUGGEST_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
export const SEARCH_SUGGEST_DEBOUNCE_MS = 300;
