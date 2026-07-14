/**
 * Mirror of packages/sanity/src/algolia/post-record.ts for the deployed Function bundle.
 * Keep in sync when changing projection or record shape.
 */

import {
  buildImageUrl,
  isImageAssetId,
  parseImageAssetId,
} from "@sanity/asset-utils";

export const ALGOLIA_INDEX_NAME = "posts";
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
  image?: AlgoliaPostImageRef | null;
  allowIndex?: boolean | null;
  operation?: "create" | "update" | "delete" | string;
};

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

export function imageUrlFromAssetRef(
  assetRef: string | null | undefined,
  projectId: string,
  dataset: string,
): string | null {
  if (!assetRef || !isImageAssetId(assetRef)) return null;
  const parts = parseImageAssetId(assetRef);
  return buildImageUrl({
    ...parts,
    projectId,
    dataset,
  });
}

export function toAlgoliaRecord(
  source: AlgoliaPostSource,
  projectId: string,
  dataset: string,
): AlgoliaPostRecord {
  const title = (source.title ?? "").slice(0, ALGOLIA_MAX_TITLE_CHARS);
  const fullContent = source.content ?? "";
  // Compute from the untruncated body so adaptive truncation below does not
  // undercount long posts. Formula mirrors GROQ READING_TIME_MINUTES_PROJECTION.
  const readingTimeMinutes = Math.round(
    fullContent.length / 5 / ALGOLIA_READING_TIME_WPM,
  );
  const content = fullContent.slice(0, ALGOLIA_MAX_CONTENT_CHARS);
  const imageUrl = imageUrlFromAssetRef(
    source.image?.assetRef,
    projectId,
    dataset,
  );

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

  // Adaptive truncation — keep the WHOLE record under budget (mirror of
  // packages/sanity/src/algolia/post-record.ts; keep in sync).
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
    console.warn(
      `Algolia record ${source._id} is ${size} bytes even with empty content`,
    );
  }

  return record;
}

export function shouldRemoveFromAlgolia(source: AlgoliaPostSource): boolean {
  return source.operation === "delete" || source.allowIndex === false;
}
