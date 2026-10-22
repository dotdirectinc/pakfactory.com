import { PRIMARY_PRODUCT_IMAGE_GROQ } from "../queries/catalog-media";
import {
  HAS_DETAIL_PAGE,
  LINE_STYLE_HAS_PAGE,
  OPTION_ACTIVE,
  PRODUCT_HAS_PAGE,
  SOLUTION_ACTIVE,
  SOLUTION_STYLE_ACTIVE,
} from "../queries/status-gates";

/**
 * `site_search` — the ONE Algolia index behind the www ⌘K search (PROD-2525 / PROD-3109).
 *
 * One index with `type` and `group` facets, not one index per type: the dialog then
 * makes a single query per keystroke and reads the rail counts from the facets. Algolia
 * bills every query in a multi-index batch separately, so per-type indexes would multiply
 * the cost of every keystroke by the number of rail tabs.
 *
 * Separate from `content_*` (admin search, ADR-018) and `posts` (blog typeahead) — both
 * stay as they are. Never put RFQ or customer data in here: the www API serves it to the
 * public.
 *
 * ── Where the rules live ────────────────────────────────────────────────────────
 *
 * Everything — which documents qualify, and the whole record: link, summary, image,
 * tags, facets — is ONE GROQ query. The backfill runs it over the dataset
 * (`SITE_SEARCH_BACKFILL_QUERY`); the Function runs it for the one document that changed
 * (`SITE_SEARCH_DOC_QUERY`). A document the query no longer returns is removed from the
 * index — that is how hiding works.
 *
 * Why the Function queries instead of using its event projection: Function projections
 * cannot run sub-queries (Sanity, "GROQ feature support across Sanity"), and the image
 * fallbacks below need them. Why the record is built in GROQ rather than in TypeScript:
 * the Function bundle cannot import this package, so all it carries is a GENERATED copy
 * of the query string (`functions/site-search-sync/query.generated.ts`, from
 * `pnpm --filter @pakfactory/sanity run gen:site-search-fn`). No mapping code to mirror.
 *
 * Each type's gate is the one its www page uses, so a record never links to a 404:
 *   product              PRODUCT_HAS_PAGE (own status, rule 1, R1) — the PDP's gate
 *   productLine          LINE_STYLE_HAS_PAGE + it has a product or a style (www returns
 *                        no page for a line with no products or styles —
 *                        fetchSanityLineBySlug; this counts any, listed or not)
 *   productStyle         LINE_STYLE_HAS_PAGE + its line is Active/Discontinued
 *                        (CATALOG_PRODUCT_STYLE_PAGE_QUERY)
 *   solution             SOLUTION_ACTIVE
 *   solutionStyle        SOLUTION_STYLE_ACTIVE + its solution is Active
 *   customizationOption  OPTION_ACTIVE + HAS_DETAIL_PAGE (CATALOG_CUSTOMIZATION_DETAIL_QUERY)
 *   caseStudy            CASE_STUDY_LIVE — published and publishedAt <= now()
 *   expertiseStage       status != "discontinued" (expertise.ts)
 *   pressRelease         PRESS_RELEASE_LIVE — publishedAt <= now()
 *   post                 the blog's own filter + publishedAt <= now()
 *
 * Not indexed: customization CATEGORIES (`/customizations/[category]` is a placeholder
 * page today), expertise SERVICES (no route), bundles (none exist), policies / About /
 * Contact (fixed quick links in the dialog, not search results).
 *
 * Property values are not records. Their titles are `tags` on the products and options
 * that carry them, so "soft-touch" finds the soft-touch products. Whether a value should
 * also be its own result (linking to the filtered customization catalog) is open on
 * PROD-3109.
 *
 * ⚠️ Known gaps, both caught by the next backfill:
 *   - A PARENT's change (a line, style, solution, type or category switched off) fires no
 *     event for its children, so they stay in the index until then. The www API drops
 *     hits whose page is gone (PROD-3110).
 *   - A scheduled date: a case study, press release or post saved with a FUTURE
 *     publishedAt is skipped when saved, and nothing re-fires when the date passes.
 *
 * Links are www paths. Blog posts are `/blog/{slug}`, which is the www origin in
 * production but a different host on staging (staging-blog.pakfactory.com) — the API
 * resolves the blog origin; the record stays host-free.
 */

export const SITE_SEARCH_INDEX = "site_search";

/** Sanity `_type`s that can become a `site_search` record. */
export const SITE_SEARCH_DOC_TYPES = [
  "product",
  "productLine",
  "productStyle",
  "solution",
  "solutionStyle",
  "customizationOption",
  "caseStudy",
  "expertiseStage",
  "pressRelease",
  "post",
] as const;

export type SiteSearchDocType = (typeof SITE_SEARCH_DOC_TYPES)[number];

/**
 * Per Sanity type: the public record `type` (never a Sanity `_type`), its rail `group`,
 * and `typeRank` — the tie-break when relevance is equal (lower first; products lead,
 * press releases trail).
 *
 * Groups are the dialog's rail tabs (Trending is the idle state, not a group). Materials
 * are customization options and sit under Customizations; property values get no tab
 * (decided 2026-10-16).
 */
export const SITE_SEARCH_TYPES = {
  product: { type: "product", group: "products", typeRank: 1 },
  productLine: { type: "product-line", group: "products", typeRank: 2 },
  productStyle: { type: "product-style", group: "products", typeRank: 3 },
  customizationOption: { type: "customization", group: "customizations", typeRank: 4 },
  solution: { type: "solution", group: "solutions", typeRank: 5 },
  solutionStyle: { type: "solution-style", group: "solutions", typeRank: 6 },
  post: { type: "guide", group: "guides", typeRank: 7 },
  caseStudy: { type: "case-study", group: "resources", typeRank: 8 },
  expertiseStage: { type: "expertise", group: "resources", typeRank: 9 },
  pressRelease: { type: "press-release", group: "resources", typeRank: 10 },
} as const satisfies Record<
  SiteSearchDocType,
  { type: string; group: string; typeRank: number }
>;

export type SiteSearchType =
  (typeof SITE_SEARCH_TYPES)[SiteSearchDocType]["type"];
export type SiteSearchGroup =
  (typeof SITE_SEARCH_TYPES)[SiteSearchDocType]["group"];

/** `select(_type == "product" => "product", …)` for one column of SITE_SEARCH_TYPES. */
function selectByType(key: "type" | "group" | "typeRank"): string {
  const arms = Object.entries(SITE_SEARCH_TYPES).map(
    ([docType, row]) => `_type == ${JSON.stringify(docType)} => ${JSON.stringify(row[key])}`,
  );
  return `select(${arms.join(", ")})`;
}

const LIVE_BY_DATE = /* groq */ `defined(publishedAt) && publishedAt <= now()`;

/** Per-type "has a www page" gate — see the table in the header. Whitelist: unknown types are false. */
const SITE_SEARCH_VISIBLE = /* groq */ `select(
    _type == "product" => ${PRODUCT_HAS_PAGE},
    _type == "productLine" => ${LINE_STYLE_HAS_PAGE} && count(*[_type in ["product", "productStyle"] && productLine._ref == ^._id && !(_id in path("drafts.**"))]) > 0,
    _type == "productStyle" => ${LINE_STYLE_HAS_PAGE} && defined(productLine->slug.current) && (!defined(productLine->status) || productLine->status in ["active", "discontinued"]),
    _type == "solution" => ${SOLUTION_ACTIVE},
    _type == "solutionStyle" => ${SOLUTION_STYLE_ACTIVE} && defined(solution->slug.current) && solution->status == "active",
    _type == "customizationOption" => ${OPTION_ACTIVE} && ${HAS_DETAIL_PAGE} && defined(type->category->slug.current),
    _type == "caseStudy" => ${LIVE_BY_DATE},
    _type == "expertiseStage" => status != "discontinued",
    _type == "pressRelease" => ${LIVE_BY_DATE},
    _type == "post" => ${LIVE_BY_DATE},
    false
  )`;

/** Every document that belongs in `site_search` — published, titled, with a page. */
export const SITE_SEARCH_FILTER = /* groq */ `_type in ${JSON.stringify(SITE_SEARCH_DOC_TYPES)} && defined(slug.current) && defined(title) && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && allowIndex != false && ${SITE_SEARCH_VISIBLE}`;

/**
 * An image object → its URL / alt; alt as www resolves it (catalog-media.ts IMAGE_ALT).
 * No image → null. Most inspiration products and many options have no image of their
 * own yet (2026-10-19: 741 presets, 193 options); www shows none for them either, so the
 * index does not invent one from the base product.
 *
 * Lines, styles and solutions have no image of their own at all (2026-10-19: 0 of 17
 * lines, 0 of 98 styles, 0 of 19 Active solutions), so they borrow one from a child —
 * a sub-query, and why this projection only runs on the Query API.
 */
const IMAGE_SOURCE = /* groq */ `select(
    _type in ["product", "customizationOption"] => ${PRIMARY_PRODUCT_IMAGE_GROQ},
    _type == "productLine" => coalesce(
      ${PRIMARY_PRODUCT_IMAGE_GROQ},
      cardImage,
      *[_type == "product" && productLine._ref == ^._id && defined(images[0].asset) && !(_id in path("drafts.**"))] | order(title asc)[0].images[0]
    ),
    _type == "productStyle" => coalesce(
      ${PRIMARY_PRODUCT_IMAGE_GROQ},
      image,
      cardImage,
      *[_type == "product" && ^._id in productStyle[]._ref && defined(images[0].asset) && !(_id in path("drafts.**"))] | order(title asc)[0].images[0]
    ),
    _type == "solution" => coalesce(
      images[primary == true][0],
      images[0],
      featuredImage,
      *[_type == "solutionStyle" && solution._ref == ^._id && status == "active" && defined(images[0].asset) && !(_id in path("drafts.**"))] | order(title asc)[0].images[0]
    ),
    _type == "solutionStyle" => coalesce(images[primary == true][0], images[0], featuredImage),
    _type == "caseStudy" => coalesce(cardImage, heroMedia.image, ogImage),
    _type == "expertiseStage" => coalesce(heroImage, ogImage),
    _type == "pressRelease" => coalesce(heroMedia.image, ogImage),
    _type == "post" => mainImage
  )`;

/**
 * The finished Algolia record, in two stages: the first picks the image source once (its
 * fallbacks are sub-queries), the second shapes the record. Field by field:
 *   type / group / typeRank   from SITE_SEARCH_TYPES
 *   kind                      products only: standard | inspiration
 *   sku                       products only; null for temporary `TMP-` codes (PROD-3136)
 *   href                      the www path — same shapes as apps/www/src/lib/www-routes.ts
 *   parents                   titles of what the document sits under (line, styles,
 *                             solutions, option type + category, client, blog category)
 *   tags                      property-value titles (products, options); blog tags
 *   publishedAtTimestamp      ms since epoch; 0 when undated
 */
export const SITE_SEARCH_PROJECTION = /* groq */ `{
  ...,
  "_image": ${IMAGE_SOURCE}
}{
  "objectID": _id,
  "type": ${selectByType("type")},
  "group": ${selectByType("group")},
  "typeRank": ${selectByType("typeRank")},
  "kind": select(_type == "product" => coalesce(kind, "standard")),
  "sku": select(
    _type == "product" && defined(sku) && !string::startsWith(upper(sku), "TMP-") => sku
  ),
  title,
  "href": select(
    _type in ["product", "productLine"] => "/products/" + slug.current,
    _type == "productStyle" => "/products/" + productLine->slug.current + "/" + slug.current,
    _type == "solution" => "/solutions/" + slug.current,
    _type == "solutionStyle" => "/solutions/" + solution->slug.current + "/" + slug.current,
    _type == "customizationOption" => "/customizations/" + type->category->slug.current + "/" + slug.current,
    _type == "caseStudy" => "/case-studies/" + slug.current,
    _type == "expertiseStage" => "/expertise/" + slug.current,
    _type == "pressRelease" => "/newsroom/" + slug.current,
    _type == "post" => "/blog/" + slug.current
  ),
  "summary": coalesce(select(
    _type == "caseStudy" => coalesce(cardSummary, pt::text(heroIntro)),
    _type == "expertiseStage" => coalesce(description, tagline),
    _type == "pressRelease" => summary,
    _type == "post" => coalesce(excerpt, tldr),
    coalesce(shortDescription, pt::text(description))
  ), ""),
  "image": _image.asset->url,
  "imageAlt": coalesce(_image.alt, _image.asset->altText, ""),
  "hoverImage": select(_type == "product" => images[1].asset->url),
  "parents": array::unique(array::compact(select(
    _type == "product" => [productLine->title, ...productStyle[]->title, ...solutions[]->title],
    _type == "productStyle" => [productLine->title],
    _type == "solutionStyle" => [solution->title],
    _type == "customizationOption" => [type->title, type->category->title],
    _type == "caseStudy" => [client->name],
    _type == "post" => [category->title],
    []
  ))),
  "tags": array::unique(array::compact(select(
    _type == "product" => properties[].values[]->title,
    _type == "customizationOption" => properties[]->title,
    _type == "post" => tags[]->title,
    []
  ))),
  "publishedAtTimestamp": coalesce(
    (dateTime(publishedAt) - dateTime("1970-01-01T00:00:00Z")) * 1000,
    0
  )
}`;

/** Backfill: every qualifying document, already shaped as records. */
export const SITE_SEARCH_BACKFILL_QUERY = /* groq */ `*[${SITE_SEARCH_FILTER}]${SITE_SEARCH_PROJECTION}`;

/** Function: the one document's record, or null when it no longer qualifies (→ remove it). */
export const SITE_SEARCH_DOC_QUERY = /* groq */ `*[_id == $id && ${SITE_SEARCH_FILTER}][0]${SITE_SEARCH_PROJECTION}`;

/**
 * Blueprint event filter — deliberately WIDER than SITE_SEARCH_FILTER: a document
 * that stops qualifying (status off, slug cleared, allowIndex off) must still fire so the
 * Function can remove it.
 */
export const SITE_SEARCH_EVENT_FILTER = /* groq */ `_type in ${JSON.stringify(SITE_SEARCH_DOC_TYPES)}`;

/** Blueprint projection — the Function re-reads everything else (see header). */
export const SITE_SEARCH_EVENT_PROJECTION = /* groq */ `{_id, _type, "operation": delta::operation()}`;

export const SITE_SEARCH_SETTINGS = {
  // A SKU match outranks a title match; a SKU one character off matches nothing (PROD-3136).
  searchableAttributes: ["sku", "title", "tags", "parents", "unordered(summary)"],
  disableTypoToleranceOnAttributes: ["sku"],
  attributesForFaceting: ["type", "group", "filterOnly(kind)"],
  customRanking: ["asc(typeRank)", "desc(publishedAtTimestamp)"],
  attributesToSnippet: ["summary:20"],
  // "mailer boxes" finds "Mailer Box"; "the", "for" do not drown the query.
  ignorePlurals: ["en"],
  removeStopWords: ["en"],
  queryLanguages: ["en"],
} as const;

/** Algolia rejects records over 10 KB; ours average ~0.6 KB (2026-10-19, max 0.84 KB). */
export const SITE_SEARCH_MAX_RECORD_BYTES = 9500;

export type SiteSearchRecord = {
  objectID: string;
  type: SiteSearchType;
  group: SiteSearchGroup;
  typeRank: number;
  kind: "standard" | "inspiration" | null;
  /** Products only; null for other types and for temporary `TMP-` codes. */
  sku: string | null;
  title: string;
  /** www path, host-free (`/products/…`, `/blog/…`). */
  href: string;
  summary: string;
  image: string | null;
  imageAlt: string;
  /** Product `images[1]` URL when present (PROD-3130). Other types: null. */
  hoverImage: string | null;
  parents: string[];
  tags: string[];
  publishedAtTimestamp: number;
};

/**
 * Why a query row cannot be saved, or null when it can. A row the filter returned
 * always has a type, title and href; this guards the size limit and anything a later
 * edit to the projection breaks. The Function repeats it (query.generated.ts).
 */
export function siteSearchRecordProblem(
  record: Partial<SiteSearchRecord> | null | undefined,
): string | null {
  if (!record?.objectID) return "no objectID";
  if (!record.type) return "unknown type";
  if (!record.title?.trim()) return "no title";
  if (!record.href) return "no link";
  const bytes = new TextEncoder().encode(JSON.stringify(record)).length;
  if (bytes > SITE_SEARCH_MAX_RECORD_BYTES) return `${bytes} bytes`;
  return null;
}
