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

/**
 * Sort → Algolia index map. `relevance` is kept for typeahead
 * (`algolia-suggest.ts`). Search listing sorts (`newest` / `updated` /
 * `popular`) are served by GROQ; `updated`/`popular` map to the primary
 * index only so the Record type stays complete — there is no
 * lastModified/viewCount replica (viewCount is not indexed).
 */
export const ALGOLIA_SORT_INDEX: Record<
  "relevance" | "newest" | "updated" | "popular",
  string
> = {
  relevance: ALGOLIA_INDEX_NAME,
  newest: "posts_publishedAt_desc",
  updated: ALGOLIA_INDEX_NAME,
  popular: ALGOLIA_INDEX_NAME,
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

/** Hard budget for the serialized record — safely under Algolia's 10,000-byte API limit. */
export const ALGOLIA_RECORD_TARGET_BYTES = 9500;
export const ALGOLIA_MAX_TITLE_CHARS = 500;
export const ALGOLIA_RECORD_WARN_BYTES = 9000;

/**
 * Words-per-minute for estimated reading time — must match
 * `READING_TIME_WPM` in `packages/sanity/src/queries/blog.ts`.
 * Computed at index time from the full `pt::text(body)` before
 * adaptive content truncation, so long posts are not undercounted.
 */
export const ALGOLIA_READING_TIME_WPM = 238;

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
  /** Estimated minutes; same formula as GROQ `READING_TIME_MINUTES_PROJECTION`. */
  readingTimeMinutes: number;
};

export type ImageUrlResolver = (assetRef?: string | null) => string | null;

export function toAlgoliaRecord(
  source: AlgoliaPostSource,
  resolveImageUrl: ImageUrlResolver,
): AlgoliaPostRecord {
  const title = (source.title ?? "").slice(0, ALGOLIA_MAX_TITLE_CHARS);
  const fullContent = source.content ?? "";
  // Compute from the untruncated body so adaptive truncation below does not
  // undercount long posts. Formula mirrors GROQ READING_TIME_MINUTES_PROJECTION.
  const readingTimeMinutes = Math.round(
    fullContent.length / 5 / ALGOLIA_READING_TIME_WPM,
  );
  const content = fullContent.slice(0, ALGOLIA_MAX_CONTENT_CHARS);
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
    readingTimeMinutes,
  };

  // Adaptive truncation: the fixed content cap isn't enough when other fields
  // (title, excerpt, tags, URLs) are large — WordPress-imported posts blew the
  // 10KB API limit. Shrink `content` until the WHOLE record fits the budget.
  // JSON.stringify length measures serialized bytes incl. escaping overhead.
  let size = JSON.stringify(record).length;
  while (size > ALGOLIA_RECORD_TARGET_BYTES && record.content.length > 0) {
    const overage = size - ALGOLIA_RECORD_TARGET_BYTES;
    record.content = record.content.slice(
      0,
      Math.max(0, record.content.length - Math.max(overage, 200)),
    );
    size = JSON.stringify(record).length;
  }
  if (size > ALGOLIA_RECORD_TARGET_BYTES) {
    // Content is already empty and we're still over budget — other fields are
    // huge. Surface it loudly; this record needs manual attention.
    console.warn(
      `Algolia record ${source._id} is ${size} bytes even with empty content`,
    );
  }

  return record;
}

export function shouldRemoveFromAlgolia(source: AlgoliaPostSource): boolean {
  return source.operation === "delete" || source.allowIndex === false;
}
