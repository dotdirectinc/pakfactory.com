/**
 * Shared Algolia post projection + record mapping (PROD-1957).
 * Used by sanity.blueprint.ts, studio backfill scripts, and kept in sync with
 * functions/algolia-document-sync/record.ts (deployed Function bundle).
 */

export const ALGOLIA_INDEX_NAME = "posts";

export const ALGOLIA_POST_FILTER =
  '_type == "post" && defined(slug.current) && !(_id in path("drafts.**")) && allowIndex != false';

/** GROQ projection for blueprint events, backfill, and Function payloads. */
export const ALGOLIA_POST_PROJECTION = /* groq */ `{
  _id,
  _type,
  _rev,
  title,
  "slug": slug.current,
  excerpt,
  tldr,
  "content": pt::text(body),
  "category": category->{title, "slug": slug.current},
  "tags": tags[]->{title, "slug": slug.current},
  "author": author->{name, "slug": slug.current},
  publishedAt,
  lastModified,
  _createdAt,
  _updatedAt,
  "image": {"assetRef": mainImage.asset._ref, "alt": mainImage.alt},
  allowIndex,
  "operation": delta::operation()
}`;

/** Backfill query projection (no delta::operation). */
export const ALGOLIA_POST_BACKFILL_PROJECTION = /* groq */ `{
  _id,
  _type,
  _rev,
  title,
  "slug": slug.current,
  excerpt,
  tldr,
  "content": pt::text(body),
  "category": category->{title, "slug": slug.current},
  "tags": tags[]->{title, "slug": slug.current},
  "author": author->{name, "slug": slug.current},
  publishedAt,
  lastModified,
  _createdAt,
  _updatedAt,
  "image": {"assetRef": mainImage.asset._ref, "alt": mainImage.alt},
  allowIndex
}`;

export const ALGOLIA_INITIAL_SYNC_QUERY = /* groq */ `*[${ALGOLIA_POST_FILTER}]${ALGOLIA_POST_BACKFILL_PROJECTION}`;

export const ALGOLIA_INDEX_SETTINGS = {
  searchableAttributes: [
    "title",
    "excerpt",
    "tldr",
    "content",
    "tags.title",
    "category.title",
    "author.name",
  ],
  attributesForFaceting: [
    "searchable(category.slug)",
    "searchable(tags.slug)",
  ],
  customRanking: ["desc(publishedAtTimestamp)"],
  replicas: [
    "posts_publishedAt_desc",
    "posts_publishedAt_asc",
    "posts_title_asc",
  ],
} as const;

export const ALGOLIA_SORT_INDEX: Record<
  "relevance" | "newest" | "oldest" | "title",
  string
> = {
  relevance: ALGOLIA_INDEX_NAME,
  newest: "posts_publishedAt_desc",
  oldest: "posts_publishedAt_asc",
  title: "posts_title_asc",
};

export const ALGOLIA_REPLICA_SETTINGS: Record<
  string,
  { ranking: string[] }
> = {
  posts_publishedAt_desc: {
    ranking: [
      "desc(publishedAtTimestamp)",
      "typo",
      "geo",
      "words",
      "filters",
      "proximity",
      "attribute",
      "exact",
      "custom",
    ],
  },
  posts_publishedAt_asc: {
    ranking: [
      "asc(publishedAtTimestamp)",
      "typo",
      "geo",
      "words",
      "filters",
      "proximity",
      "attribute",
      "exact",
      "custom",
    ],
  },
  posts_title_asc: {
    ranking: [
      "asc(title)",
      "typo",
      "geo",
      "words",
      "filters",
      "proximity",
      "attribute",
      "exact",
      "custom",
    ],
  },
};

export const ALGOLIA_MAX_CONTENT_CHARS = 8000;
export const ALGOLIA_MAX_TITLE_CHARS = 500;
export const ALGOLIA_RECORD_WARN_BYTES = 9000;

export type AlgoliaPostImageRef = {
  assetRef?: string | null;
  alt?: string | null;
};

export type AlgoliaPostCategory = {
  title?: string | null;
  slug?: string | null;
} | null;

export type AlgoliaPostTag = {
  title?: string | null;
  slug?: string | null;
};

export type AlgoliaPostAuthor = {
  name?: string | null;
  slug?: string | null;
} | null;

/** Document shape from GROQ projection or Function event.data. */
export type AlgoliaPostSource = {
  _id: string;
  _type?: string;
  _rev?: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  tldr?: string | null;
  content?: string | null;
  category?: AlgoliaPostCategory;
  tags?: AlgoliaPostTag[] | null;
  author?: AlgoliaPostAuthor;
  publishedAt?: string | null;
  lastModified?: string | null;
  _createdAt?: string | null;
  _updatedAt?: string | null;
  image?: AlgoliaPostImageRef | null;
  allowIndex?: boolean | null;
  operation?: "create" | "update" | "delete" | string;
};

/** Algolia index record (objectID set at write time). */
export type AlgoliaPostRecord = {
  objectID: string;
  _type?: string;
  _rev?: string;
  title: string;
  slug: string;
  excerpt: string;
  tldr: string;
  content: string;
  category: AlgoliaPostCategory;
  tags: AlgoliaPostTag[];
  author: AlgoliaPostAuthor;
  publishedAt: string | null;
  publishedAtTimestamp: number;
  lastModified: string | null;
  image: string | null;
  imageAlt: string;
};

export type ImageUrlResolver = (assetRef?: string | null) => string | null;

export function toAlgoliaRecord(
  source: AlgoliaPostSource,
  resolveImageUrl: ImageUrlResolver,
): AlgoliaPostRecord {
  const title = (source.title ?? "").slice(0, ALGOLIA_MAX_TITLE_CHARS);
  const content = (source.content ?? "").slice(0, ALGOLIA_MAX_CONTENT_CHARS);
  const imageUrl = resolveImageUrl(source.image?.assetRef);

  const record: AlgoliaPostRecord = {
    objectID: source._id,
    _type: source._type,
    _rev: source._rev,
    title,
    slug: source.slug ?? "",
    excerpt: source.excerpt ?? "",
    tldr: source.tldr ?? "",
    content,
    category: source.category ?? null,
    tags: source.tags ?? [],
    author: source.author ?? null,
    publishedAt: source.publishedAt ?? null,
    publishedAtTimestamp: source.publishedAt ? Date.parse(source.publishedAt) : 0,
    lastModified: source.lastModified ?? null,
    image: imageUrl,
    imageAlt: source.image?.alt ?? "",
  };

  const size = JSON.stringify(record).length;
  if (size > ALGOLIA_RECORD_WARN_BYTES) {
    console.warn(
      `Algolia record ${source._id} is ${size} bytes (close to 10KB limit)`,
    );
  }

  return record;
}

export function shouldRemoveFromAlgolia(source: AlgoliaPostSource): boolean {
  return source.operation === "delete" || source.allowIndex === false;
}
