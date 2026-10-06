import { HAS_DETAIL_PAGE, OPTION_ACTIVE, PRODUCT_HAS_PAGE } from "../queries/status-gates";

/**
 * Content-corpus Algolia indexes for admin search (ADR-018).
 * Separate from blog `posts` and ops `admin_*` — never mix RFQ PII here.
 *
 * Indexes: content_products | content_customizations | content_case_studies
 * Blog continues to use `posts` via post-record.ts.
 */

export const CONTENT_PRODUCTS_INDEX = "content_products";
export const CONTENT_CUSTOMIZATIONS_INDEX = "content_customizations";
export const CONTENT_CASE_STUDIES_INDEX = "content_case_studies";

export const CONTENT_INDEX_NAMES = [
  CONTENT_PRODUCTS_INDEX,
  CONTENT_CUSTOMIZATIONS_INDEX,
  CONTENT_CASE_STUDIES_INDEX,
] as const;

export type ContentIndexName = (typeof CONTENT_INDEX_NAMES)[number];

export const ALGOLIA_CONTENT_MAX_CHARS = 4000;
export const ALGOLIA_CONTENT_TITLE_CHARS = 500;

/** Document filter for incremental sync (all three content types). */
export const ALGOLIA_CONTENT_SYNC_FILTER = /* groq */ `_type in ["product", "customizationOption", "caseStudy"] && defined(slug.current)`;

/**
 * Whether a document belongs in its content index — the same answer www gives about
 * its page (PROD-2845 and the 2026-10-06 visibility rules). Computed in GROQ so the
 * Function, which only sees its projection, can remove a record when a document stops
 * qualifying (it used to read the retired option `role`, and never removed a product
 * on a status change at all):
 *   product              PRODUCT_HAS_PAGE — own status, every-parent-off (rule 1), its line (R1)
 *   customizationOption  OPTION_ACTIVE + a detail page — own status, its type and category (R1)
 *   caseStudy            published (checked in shouldRemoveContentFromAlgolia)
 * ⚠️ A parent's status change (a line, style, solution, type) fires no event for its
 * children, so the index catches up on the next backfill for those.
 */
const INDEXABLE = /* groq */ `"indexable": select(
    _type == "product" => ${PRODUCT_HAS_PAGE},
    _type == "customizationOption" => ${OPTION_ACTIVE} && ${HAS_DETAIL_PAGE},
    true
  )`;

export const ALGOLIA_CONTENT_PROJECTION = /* groq */ `{
  _id,
  _type,
  _rev,
  title,
  "slug": slug.current,
  shortName,
  "description": coalesce(shortName, pt::text(description), ""),
  "typeTitle": type->title,
  "categorySlug": type->category->slug.current,
  "categoryTitle": type->category->title,
  "clientName": client->name,
  "intro": pt::text(heroIntro),
  publishedAt,
  allowIndex,
  ${INDEXABLE},
  "operation": delta::operation()
}`;

export const ALGOLIA_CONTENT_BACKFILL_PROJECTION = /* groq */ `{
  _id,
  _type,
  _rev,
  title,
  "slug": slug.current,
  shortName,
  "description": coalesce(shortName, pt::text(description), ""),
  "typeTitle": type->title,
  "categorySlug": type->category->slug.current,
  "categoryTitle": type->category->title,
  "clientName": client->name,
  "intro": pt::text(heroIntro),
  publishedAt,
  allowIndex,
  ${INDEXABLE}
}`;

/**
 * Indexed products are the ones with a PAGE, which is wider than the ones that are
 * listed: a coming-soon product and a discontinued one both keep a URL worth finding.
 * PRODUCT_HAS_PAGE is the PDP's own gate — own status (a whitelist, so `not-active` and
 * `active-internal` fall out unnamed), plus rule 1 and R1, so a product hidden by its
 * parents is not findable either.
 */
export const CONTENT_PRODUCTS_FILTER = `_type == "product" && defined(slug.current) && !(_id in path("drafts.**")) && allowIndex != false && ${PRODUCT_HAS_PAGE}`;

/**
 * Options with a detail page a customer can reach. `role` was retired into `appearsIn`
 * (PROD-2732) and is unset everywhere, so the old `role != "configurable"` matched
 * every option, including Not active ones and those with no page.
 */
export const CONTENT_CUSTOMIZATIONS_FILTER = `_type == "customizationOption" && defined(slug.current) && !(_id in path("drafts.**")) && allowIndex != false && ${OPTION_ACTIVE} && ${HAS_DETAIL_PAGE} && defined(type->category->slug.current)`;

export const CONTENT_CASE_STUDIES_FILTER =
  '_type == "caseStudy" && defined(slug.current) && !(_id in path("drafts.**")) && defined(publishedAt) && publishedAt <= now() && allowIndex != false';

export const CONTENT_PRODUCTS_SYNC_QUERY = /* groq */ `*[${CONTENT_PRODUCTS_FILTER}]${ALGOLIA_CONTENT_BACKFILL_PROJECTION}`;
export const CONTENT_CUSTOMIZATIONS_SYNC_QUERY = /* groq */ `*[${CONTENT_CUSTOMIZATIONS_FILTER}]${ALGOLIA_CONTENT_BACKFILL_PROJECTION}`;
export const CONTENT_CASE_STUDIES_SYNC_QUERY = /* groq */ `*[${CONTENT_CASE_STUDIES_FILTER}]${ALGOLIA_CONTENT_BACKFILL_PROJECTION}`;

export const CONTENT_PRODUCTS_SETTINGS = {
  searchableAttributes: ["title", "shortName", "description", "slug"],
  attributesForFaceting: ["filterOnly(_type)"],
  customRanking: ["asc(title)"],
} as const;

export const CONTENT_CUSTOMIZATIONS_SETTINGS = {
  searchableAttributes: [
    "title",
    "shortName",
    "typeTitle",
    "categoryTitle",
    "description",
    "slug",
  ],
  attributesForFaceting: [
    "filterOnly(_type)",
    "searchable(categorySlug)",
  ],
  customRanking: ["asc(title)"],
} as const;

export const CONTENT_CASE_STUDIES_SETTINGS = {
  searchableAttributes: ["title", "clientName", "intro", "slug"],
  attributesForFaceting: ["filterOnly(_type)"],
  customRanking: ["desc(publishedAtTimestamp)"],
} as const;

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
  /** False when the document no longer qualifies for its index — see INDEXABLE. */
  indexable?: boolean | null;
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
): ContentIndexName | null {
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
  if (source.indexable === false) {
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
