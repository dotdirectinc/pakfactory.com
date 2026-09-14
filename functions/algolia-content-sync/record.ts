/**
 * Mirror of packages/sanity/src/algolia/content-indexes.ts for the Function bundle.
 * Keep in sync when changing indexes, projection, or record shape.
 */

export const CONTENT_PRODUCTS_INDEX = "content_products";
export const CONTENT_CUSTOMIZATIONS_INDEX = "content_customizations";
export const CONTENT_CASE_STUDIES_INDEX = "content_case_studies";

export const ALGOLIA_CONTENT_MAX_CHARS = 4000;
export const ALGOLIA_CONTENT_TITLE_CHARS = 500;

export type AlgoliaContentSource = {
  _id: string;
  _type?: string | null;
  _rev?: string | null;
  title?: string | null;
  slug?: string | null;
  shortName?: string | null;
  description?: string | null;
  typeTitle?: string | null;
  categorySlug?: string | null;
  categoryTitle?: string | null;
  clientName?: string | null;
  intro?: string | null;
  publishedAt?: string | null;
  allowIndex?: boolean | null;
  role?: string | null;
  operation?: "create" | "update" | "delete" | string;
};

export type AlgoliaContentRecord = {
  objectID: string;
  _type: string;
  _rev?: string;
  title: string;
  slug: string;
  shortName: string;
  description: string;
  typeTitle: string;
  categorySlug: string;
  categoryTitle: string;
  clientName: string;
  intro: string;
  publishedAt: string | null;
  publishedAtTimestamp: number;
};

export function contentIndexForType(
  type: string | null | undefined,
): string | null {
  switch (type) {
    case "product":
      return CONTENT_PRODUCTS_INDEX;
    case "customizationOption":
      return CONTENT_CUSTOMIZATIONS_INDEX;
    case "caseStudy":
      return CONTENT_CASE_STUDIES_INDEX;
    default:
      return null;
  }
}

export function shouldRemoveContentFromAlgolia(
  source: AlgoliaContentSource,
): boolean {
  if (source.operation === "delete" || source.allowIndex === false) {
    return true;
  }
  if (
    source._type === "customizationOption" &&
    source.role === "configurable"
  ) {
    return true;
  }
  if (source._type === "caseStudy" && !source.publishedAt) {
    return true;
  }
  return false;
}

export function toAlgoliaContentRecord(
  source: AlgoliaContentSource,
): AlgoliaContentRecord {
  const type = source._type ?? "unknown";
  return {
    objectID: source._id,
    _type: type,
    _rev: source._rev ?? undefined,
    title: (source.title ?? "").slice(0, ALGOLIA_CONTENT_TITLE_CHARS),
    slug: source.slug ?? "",
    shortName: source.shortName ?? "",
    description: (source.description ?? "").slice(0, ALGOLIA_CONTENT_MAX_CHARS),
    typeTitle: source.typeTitle ?? "",
    categorySlug: source.categorySlug ?? "",
    categoryTitle: source.categoryTitle ?? "",
    clientName: source.clientName ?? "",
    intro: (source.intro ?? "").slice(0, ALGOLIA_CONTENT_MAX_CHARS),
    publishedAt: source.publishedAt ?? null,
    publishedAtTimestamp: source.publishedAt
      ? Date.parse(source.publishedAt)
      : 0,
  };
}
