/**
 * Catalog GROQ for the www rebuild F1a seam.
 * Field names mirror live Studio schemas (product / productLine / productStyle /
 * customizationCategory / customizationType / customizationOption). Do not bend
 * these projections to retired productPage / handle shapes.
 */

import {KIND_INSPIRATION, KIND_STANDARD} from '../product-kind';
import {
  PAGE_SECTIONS_PROJECTION,
  FEATURED_VIDEO_URL_FIELD,
  type PageSectionDoc,
} from './sections';
import {MODEL_3D_FIELDS} from './product-model-3d';
import {
  OPTION_ACTIVE,
  OPTION_TAXONOMY_ON,
  LISTED_STATUS,
  HAS_PAGE_STATUS,
  ORDERABLE_STATUS,
  HAS_DETAIL_PAGE,
  LINE_STYLE_LISTED,
  LINE_STYLE_ACTIVE,
  LINE_STYLE_HAS_PAGE,
  SOLUTION_ACTIVE,
  CUSTOMIZATION_TAXONOMY_ACTIVE,
  PARENT_STYLE_ON,
  PARENT_SOLUTION_ON,
  PRIMARY_STYLE_ON,
  PRIMARY_SOLUTION_ON,
  PRODUCT_HAS_PARENT_ON,
  PRODUCT_LINE_OPEN,
  PRODUCT_LINE_HAS_PAGE,
  PRODUCT_EFFECTIVE_STATUS,
  PRODUCT_LISTED,
  PRODUCT_HAS_PAGE,
  PRODUCT_ORDERABLE,
  SOLUTION_STYLE_ACTIVE,
} from './status-gates';
export * from './status-gates';

export {KIND_INSPIRATION, KIND_STANDARD} from '../product-kind';
export {MODEL_3D_FIELDS, MODEL_3D_URL_FIELD} from './product-model-3d';

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

/**
 * Card thumbnail.
 *
 * Style: `featuredImage` is the current field (D33 role name). Legacy keys
 * `image` (PROD-2511) and `cardImage` stay as fallbacks until content is unset.
 * The projection key stays `cardImage` for the www consumer map.
 *
 * Line: same cascade — `featuredImage` first, then legacy `cardImage` / `heroMedia`.
 */
const STYLE_CARD_IMAGE = /* groq */ `"cardImage": coalesce(featuredImage, image, cardImage){
  ...,
  "alt": ${IMAGE_ALT}
}`;

const LINE_CARD_IMAGE = /* groq */ `"cardImage": coalesce(featuredImage, cardImage, heroMedia){
  ...,
  "alt": ${IMAGE_ALT}
}`;

/** Option library / card thumb — Featured image first; media[0] until content backfill (ADR-023). */
const OPTION_CARD_IMAGE = /* groq */ `"cardImage": coalesce(featuredImage, media[0]){
  ...,
  "alt": ${IMAGE_ALT}
}`;

const CATEGORY_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  description,
  // The curated order of this category's TYPES (PROD-2740), as plain ids. Partial
  // and often absent — feed it to orderTypesInCategory rather than reading it
  // directly, which drops refs to deleted types and sorts the unlisted tail.
  // Not the category's own position among the four; that is still unsolved.
  "typeOrder": coalesce(typeOrder[]._ref, [])
}`;

const TYPE_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  customerSelects,
  cardinality,
  description,
  // Curated order of this type's OPTIONS (PROD-2748 / PROD-2775), as plain ids.
  // Partial by design — feed it to orderOptionsInType; unlisted options sort
  // alphabetically after the pinned ones.
  "optionOrder": coalesce(optionOrder[]._ref, []),
  "category": category->${CATEGORY_PROJ}
}`;


/**
 * Reverse of `customizationOption.achieves` (PROD-2629 / ADR-017).
 * Technical options (Lamination, Surface Coating, …) that can deliver this
 * customer-facing option — candidates, not a recipe.
 */
const ACHIEVED_BY_PROJ = /* groq */ `"achievedBy": *[
  _type == "customizationOption" &&
  !(_id in path("drafts.**")) &&
  ${OPTION_ACTIVE} &&
  ^._id in achieves[]._ref
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  "typeTitle": type->title,
  "categorySlug": type->category->slug.current,
  appearsIn,
  shortDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

const OPTION_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  // Effective status: a Not active Type or Category reads through as not-active (R1),
  // so every consumer that already drops non-active options (the PDP configurator's
  // \`mapAvailableCustomization\`) drops these too without knowing about the parents.
  "status": select(${OPTION_TAXONOMY_ON} => status, "not-active"),
  appearsIn,
  shortDescription,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "type": type->${TYPE_PROJ},
  ${ACHIEVED_BY_PROJ}
`;


const OPTION_PROJ = /* groq */ `{${OPTION_FIELDS}}`;

/** Product lines that offer this option (PROD-2529 reverse of availableCustomizations). */
const PRODUCT_LINES_FROM_PRODUCTS = /* groq */ `"productLines": *[
  _type == "product" &&
  ${PRODUCT_ORDERABLE} &&
  ^._id in availableCustomizations[].customization._ref &&
  // Never offer a line a customer cannot browse into. Tested on the product, not by filtering
  // \`.line\` afterwards: \`{…}.line[cond]\` applies the filter to each line object, not the list.
  // LINE_STYLE_ACTIVE and not LISTED, because this renders as a LINK: an active-internal
  // line is listed as a filter but has no page to send anyone to.
  (
    !defined(coalesce(productLine, basedOn->productLine)->status) ||
    coalesce(productLine, basedOn->productLine)->status == "active"
  )
]{
  "line": coalesce(productLine, basedOn->productLine)->{
    _id,
    title,
    "slug": slug.current
  }
}.line`;

const LINE_REF_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  cardSummary,
  "description": coalesce(cardSummary, pt::text(intro))
}`;

/**
 * `description` never reads `hero.description`: PROD-2511 removed it as placeholder
 * copy, but the key survives on 83 styles because removing a field deletes no
 * data. Authored copy only — the rich-text `description`, else `shortDescription`
 * so the style page heading isn't blank before descriptions are filled.
 */
const STYLE_REF_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "description": coalesce(pt::text(description), shortDescription),
  ${STYLE_CARD_IMAGE}
}`;

/** Library grid only needs slug + title (PROD-2599 payload trim). */
const STYLE_LIBRARY_REF_PROJ = /* groq */ `{
  title,
  "slug": slug.current
}`;

/** Hover-play / hero video URL from product `featuredVideo`; empty when unset / YouTube-only. */
const PRODUCT_FEATURED_VIDEO = FEATURED_VIDEO_URL_FIELD;
const PRODUCT_MODEL_3D = MODEL_3D_FIELDS;

/** One FAQ as the catalog pages render it. Blocks for UI; plain for JSON-LD. */
const FAQ_ITEM_PROJ = /* groq */ `{
    question,
    answer,
    "answerPlain": pt::text(answer)
  }`;

/**
 * A product's FAQs. The nearest source with ANY FAQ wins outright — nothing merges.
 *
 * - Own FAQs always win.
 * - Inspiration: else its primary solution's (`solutions[0]`) — only while that solution
 *   is Active. Nothing further (Richard, 2026-10-05).
 * - Standard: else its primary style's (`productStyle[0]`), else its line's (2026-09-28)
 *   — only while the primary style is on.
 * - An OFF primary passes nothing down, and nothing takes its place: no second parent,
 *   and for a standard product no line either (Richard + Eric, 2026-10-06 — rule 3 in
 *   the PARENT_* note above). The FAQ section is empty until the primary is fixed.
 */
const PRODUCT_FAQS_INHERITED = /* groq */ `"faqs": select(
    count(faqs) > 0 => faqs[]->${FAQ_ITEM_PROJ},
    kind == "inspiration" => select(
      ${PRIMARY_SOLUTION_ON} => solutions[0]->faqs[]->${FAQ_ITEM_PROJ}
    ),
    !${PRIMARY_STYLE_ON} => null,
    count(productStyle[0]->faqs) > 0 => productStyle[0]->faqs[]->${FAQ_ITEM_PROJ},
    coalesce(productLine, productStyle[0]->productLine)->faqs[]->${FAQ_ITEM_PROJ}
  )`;

/** Shared product projection used by by-slug and list queries. */
export const CATALOG_PRODUCT_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  sku,
  kind,
  ${PRODUCT_EFFECTIVE_STATUS},
  "description": coalesce(pt::text(description), shortDescription),
  moq,
  dimensionInput,
  dimensionRange,
  "breadcrumbParent": coalesce(
    solutions[@->solutionType == "industry"][0]->{
      title,
      "slug": slug.current
    },
    solutions[0]->{
      title,
      "slug": slug.current
    }
  ),
  ${PRODUCT_FEATURED_VIDEO},
  ${PRODUCT_MODEL_3D},
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": coalesce(productLine, basedOn->productLine)->${LINE_REF_PROJ},
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_REF_PROJ},
  // Which PDP breadcrumb crumbs have a page to link to. The primary is fixed (no
  // fallback), so an off primary still shows — as plain text, never a 404 link.
  // Line/style: R4 keeps an Active (Internal) parent as a breadcrumb LABEL only.
  "breadcrumbLinks": {
    "line": coalesce(coalesce(productLine, basedOn->productLine)->{"ok": ${LINE_STYLE_HAS_PAGE}}.ok, false),
    "style": coalesce(coalesce(productStyle[0], basedOn->productStyle[0])->{"ok": ${LINE_STYLE_HAS_PAGE}}.ok, false),
    "parent": coalesce(coalesce(
      solutions[@->solutionType == "industry"][0],
      solutions[0]
    )->{"ok": ${SOLUTION_ACTIVE}}.ok, false)
  },
  "availableCustomizations": availableCustomizations[defined(customization)]{
    preselected,
    "customization": customization->${OPTION_PROJ}
  }
`;

/**
 * Card/list projection — no availableCustomizations tree (PROD-2456).
 * PDP still uses {@link CATALOG_PRODUCT_FIELDS} (+ PDP extras on by-slug).
 */
export const CATALOG_PRODUCT_CARD_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  sku,
  kind,
  ${PRODUCT_EFFECTIVE_STATUS},
  "description": coalesce(shortDescription, pt::text(description)),
  moq,
  // Industry for Related Products style→industry fill (PROD-2780).
  "breadcrumbParent": coalesce(
    solutions[@->solutionType == "industry"][0]->{
      title,
      "slug": slug.current
    },
    solutions[0]->{
      title,
      "slug": slug.current
    }
  ),
  ${PRODUCT_FEATURED_VIDEO},
  ${PRODUCT_MODEL_3D},
  // Featured image for www productGallerySlides when gallery media is empty.
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": coalesce(productLine, basedOn->productLine)->${LINE_REF_PROJ},
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_REF_PROJ}
`;

/**
 * Product-line hero / standard preview dialog — card fields plus specs.
 * Description prefers long PT text (PDP order), not shortDescription-first cards.
 */
export const CATALOG_PRODUCT_STANDARD_PREVIEW_FIELDS = /* groq */ `
  ${CATALOG_PRODUCT_CARD_FIELDS},
  "description": coalesce(pt::text(description), shortDescription),
  "properties": properties[defined(property)]{
    "label": property->title,
    "values": values[]->title
  },
  // Line style-card image fallback matches any linked style (PROD-2843).
  "productStyles": coalesce(
    productStyle[]->{
      title,
      "slug": slug.current,
      status
    },
    basedOn->productStyle[]->{
      title,
      "slug": slug.current,
      status
    },
    []
  )[defined(slug) && ${LINE_STYLE_LISTED}]{title, slug}
`;

/**
 * Product-line Inspiration section — card fields + all industry tags +
 * customizations for SolutionProductPreview closer-look.
 */
export const CATALOG_PRODUCT_LINE_INSPIRATION_FIELDS = /* groq */ `
  ${CATALOG_PRODUCT_CARD_FIELDS},
  "industries": solutions[@->solutionType == "industry"]->{
    title,
    "slug": slug.current
  },
  "availableCustomizations": availableCustomizations[defined(customization)]{
    preselected,
    "customization": customization->${OPTION_PROJ}
  }
`;

/**
 * What the customization rules resolve a product from (PROD-2556). A preset offers what the
 * product in `basedOn` offers and stores only its own pre-selections (PROD-2530), so for a
 * preset the list and the exceptions are read from its base. Refs only — the rules catalog
 * ({@link CATALOG_CUSTOMIZATION_RULES_QUERY}) carries the options themselves.
 */
const RULES_PRODUCT_PROJ = /* groq */ `{
  "available": coalesce(availableCustomizations[].customization._ref, []),
  "exceptions": coalesce(customizationExceptions[]{ "optionId": customization._ref, mode, reason }, [])
}`;

/** PDP-only extras: specs properties, FAQs, curated related (PROD-1913), rules inputs (PROD-2556). */
export const CATALOG_PRODUCT_PDP_FIELDS = /* groq */ `
  ${CATALOG_PRODUCT_FIELDS},
  // Featured still — appended last on PDP gallery (media first). Cards use separate projections.
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "rulesProduct": select(
    kind == "inspiration" && defined(basedOn) => basedOn->${RULES_PRODUCT_PROJ},
    ${RULES_PRODUCT_PROJ}
  ),
  // PROD-2530 / PROD-2773 — an inspiration availableCustomizations list ARE its
  // pre-selections (the full offer comes from basedOn via rulesProduct). Editors
  // often leave the per-row preselected boolean unset/null, so for inspiration
  // we take every listed option id. Standard products only seed from explicit flags
  // (and the rail ignores preselect unless kind == inspiration anyway).
  "preselectedIds": select(
    kind == "inspiration" => coalesce(availableCustomizations[].customization._ref, []),
    coalesce(availableCustomizations[preselected == true].customization._ref, [])
  ),
  "properties": properties[defined(property)]{
    "label": property->title,
    "values": values[]->title
  },
  ${PRODUCT_FAQS_INHERITED},
  "relatedProducts": relatedProducts[@->{"ok": ${PRODUCT_LISTED}}.ok == true]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  },
  "sections": sections[]${PAGE_SECTIONS_PROJECTION},
  // Prefer the product's PDP layout; fall back by kind (PROD-2763):
  // inspiration → solutionProductDetailPage, else productDetailPage.
  "template": coalesce(
    template->{
      _id,
      "sections": sections[]${PAGE_SECTIONS_PROJECTION}
    },
    select(
      kind == "inspiration" => *[_id == "solutionProductDetailPage"][0]{
        _id,
        "sections": sections[]${PAGE_SECTIONS_PROJECTION}
      },
      *[_id == "productDetailPage"][0]{
        _id,
        "sections": sections[]${PAGE_SECTIONS_PROJECTION}
      }
    )
  ),
  // Membership ids for Solution Style breadcrumb resolution (PROD-2763).
  "productLineId": coalesce(productLine._ref, basedOn->productLine._ref),
  "productStyleIds": coalesce(productStyle[]._ref, basedOn->productStyle[]._ref, []),
  "solutionIds": coalesce(solutions[]._ref, [])
`;

/** Active (or unset status) products for catalog index / params. */
export const CATALOG_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${PRODUCT_LISTED}
] | order(title asc) {
  ${CATALOG_PRODUCT_CARD_FIELDS}
}`;

/**
 * Product library listing (PROD-1845) — card fields + property attrs for facets.
 * Product line includes card image for the 5th-spot entry card.
 * Property shape differs from customization options (object rows, not value refs).
 */
export const CATALOG_PRODUCT_LIBRARY_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  sku,
  kind,
  ${PRODUCT_EFFECTIVE_STATUS},
  moq,
  media[0...1]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": *[
    _id == coalesce(^.productLine._ref, ^.basedOn->productLine._ref) &&
    ${LINE_STYLE_LISTED}
  ][0]{
    _id,
    title,
    "slug": slug.current,
    cardSummary,
    "description": coalesce(cardSummary, pt::text(intro)),
    ${LINE_CARD_IMAGE}
  },
  // Primary (canonical) — card display. Membership uses productStyles (PROD-2843).
  "productStyle": *[
    _id == coalesce(^.productStyle[0]._ref, ^.basedOn->productStyle[0]._ref) &&
    ${LINE_STYLE_LISTED}
  ][0]${STYLE_LIBRARY_REF_PROJ},
  // Every listed style in Sanity order — catalog facet / style-page membership.
  // Project then filter: filter-on-deref (arr[]->[pred]) drops rows to null in
  // groq-js; filtering the projected array keeps order and drops restricted statuses.
  "productStyles": coalesce(
    productStyle[]->{
      title,
      "slug": slug.current,
      status
    },
    basedOn->productStyle[]->{
      title,
      "slug": slug.current,
      status
    },
    []
  )[defined(slug) && ${LINE_STYLE_LISTED}]{title, slug},
  "industries": solutions[@->solutionType == "industry"]->{
    title,
    "slug": slug.current
  },
  "libraryProperties": properties[defined(property)]{
    "property": property->{
      _id,
      title,
      "slug": slug.current
    },
    "values": values[]->{
      _id,
      title,
      "slug": slug.current
    }
  }
`;

export const CATALOG_PRODUCT_LIBRARY_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${PRODUCT_LISTED}
] | order(title asc) {
  ${CATALOG_PRODUCT_LIBRARY_FIELDS}
}`;

export const CATALOG_PRODUCT_BY_SLUG_QUERY = /* groq */ `*[
  _type == "product" &&
  slug.current == $slug &&
  ${PRODUCT_HAS_PAGE}
][0]{
  ${CATALOG_PRODUCT_PDP_FIELDS}
}`;

/**
 * Line landing projection (PROD-1914). Reads current productLine fields
 * (`featuredImage`, `shortDescription`, `description`) with legacy
 * `cardImage` / `heroMedia` fallbacks until content is migrated.
 * Image cascade matches `LINE_CARD_IMAGE` (library entry card).
 */
const LINE_FEATURED_IMAGE = /* groq */ `"cardImage": coalesce(featuredImage, cardImage, heroMedia){
  ...,
  "alt": ${IMAGE_ALT}
}`;

/** CMS field remains `kitMark`; app maps to featuredIcon*. */
const LINE_FEATURED_ICON = /* groq */ `kitMark{
  ...,
  "alt": ${IMAGE_ALT}
}`;

/** Desktop scroll-scrub hero video; empty when unset / YouTube-only. */
const LINE_FEATURED_VIDEO = FEATURED_VIDEO_URL_FIELD;

/** One style card on a line's styles grid. Shared by both halves of LINE_STYLES below. */
const LINE_STYLE_CARD_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "description": coalesce(pt::text(description), shortDescription),
  ${STYLE_CARD_IMAGE},
  // The style's own FAQs; the style page falls back to the line's when empty.
  "faqs": faqs[]->${FAQ_ITEM_PROJ}
}`;

/**
 * The styles grid for a line, in MERCHANDISED order (PROD-2739).
 *
 * Two tiers: the styles listed in the line's `styleOrder` in the order they were
 * dragged, then every other visible style alphabetically. `styleOrder` is order
 * only and NEVER a gate — an unlisted style still renders, it just lands in the
 * alphabetical tail. That is what makes a partial list the normal, correct state.
 *
 * 🔴 BOTH `coalesce(..., [])` calls are load-bearing, and neither is cosmetic.
 * `styleOrder` is unset on every line until someone drags something, and in GROQ
 * `null + array` is null while `_id in null[]._ref` matches nothing. Drop the
 * first and the grid returns undefined; drop the second and it returns []. Either
 * way every styles grid on the site goes empty, with no error. Both failures are
 * pinned by the "no styleOrder" case in line-style-order.test.ts — do not remove it.
 *
 * References in `styleOrder` are WEAK, so a deleted style dereferences to null
 * rather than blocking the delete; `defined(_id)` drops it before projection.
 * A pinned style that is no longer listed (discontinued, not active) is filtered by the
 * same LINE_STYLE_LISTED the tail uses, so the two tiers agree.
 */
const LINE_STYLES = /* groq */ `(
    coalesce(
      (styleOrder[]->)[defined(_id) && ${LINE_STYLE_LISTED}]${LINE_STYLE_CARD_PROJ},
      []
    )
    + *[
        _type == "productStyle" &&
        productLine._ref == ^._id &&
        ${LINE_STYLE_LISTED} &&
        !(_id in coalesce(^.styleOrder, [])[]._ref)
      ] | order(title asc) ${LINE_STYLE_CARD_PROJ}
  )`;

/** Shared projection for list + single-line fetches (PROD-1914 landing). */
export const CATALOG_PRODUCT_LINE_FIELDS = /* groq */ `
  _id,
  title,
  h1,
  shortName,
  "slug": slug.current,
  shortDescription,
  "description": pt::text(description),
  ${LINE_FEATURED_IMAGE},
  ${LINE_FEATURED_VIDEO},
  ${LINE_FEATURED_ICON},
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  metaTitle,
  metaDescription,
  "expertise": expertise[]->{
    _id,
    title,
    "slug": slug.current,
    description,
    diagram{
      ...,
      "alt": ${IMAGE_ALT}
    }
  },
  "featuredStudies": featuredStudies[]->{
    _id,
    title,
    "slug": slug.current,
    cardSummary,
    "cardImageUrl": cardImage.asset->url,
    "cardImageAlt": coalesce(cardImageAlt, cardImage.asset->altText)
  },
  "featuredProducts": featuredProducts[@->{"ok": ${PRODUCT_LISTED}}.ok == true]->{
    ${CATALOG_PRODUCT_STANDARD_PREVIEW_FIELDS}
  },
  "relatedLines": relatedLines[]->{
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    ${LINE_FEATURED_IMAGE}
  },
  "faqs": faqs[]->${FAQ_ITEM_PROJ},
  "sections": sections[]${PAGE_SECTIONS_PROJECTION},
  "template": template->{
    _id,
    heroLayout,
    "sections": sections[]${PAGE_SECTIONS_PROJECTION}
  },
  "styles": ${LINE_STYLES},
  // Product-line hero / styles: standard-only.
  "products": *[_type == "product" &&
    productLine._ref == ^._id &&
    ${KIND_STANDARD} &&
    defined(slug.current) &&
    ${PRODUCT_LISTED}
  ] | order(title asc) {
    ${CATALOG_PRODUCT_STANDARD_PREVIEW_FIELDS}
  },
  // Inspiration band: kind=inspiration for this line (incl. basedOn line), all industries.
  "inspirationProducts": *[_type == "product" &&
    coalesce(productLine, basedOn->productLine)._ref == ^._id &&
    ${KIND_INSPIRATION} &&
    defined(slug.current) &&
    ${PRODUCT_LISTED}
  ] | order(title asc) {
    ${CATALOG_PRODUCT_LINE_INSPIRATION_FIELDS}
  }
`;

export const CATALOG_PRODUCT_LINES_QUERY = /* groq */ `*[
  _type == "productLine" &&
  defined(slug.current) &&
  ${LINE_STYLE_LISTED}
] | order(title asc) {
  ${CATALOG_PRODUCT_LINE_FIELDS}
}`;

export const CATALOG_PRODUCT_LINE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "productLine" &&
  slug.current == $slug &&
  ${LINE_STYLE_HAS_PAGE}
][0]{
  ${CATALOG_PRODUCT_LINE_FIELDS}
}`;

/**
 * Existence probe for `/products/[slug]` segment resolution.
 * Product clicks wait on this (not the full line landing document).
 */
export const CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY = /* groq */ `*[
  _type == "productLine" &&
  slug.current == $slug &&
  ${LINE_STYLE_HAS_PAGE}
][0]._id`;

const PROPERTY_VALUE_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "property": property->{
    _id,
    title,
    "slug": slug.current
  }
}`;

/** Detail-page property values — media + facts for configurator / specs (PROD-1299). */
const PROPERTY_VALUE_DETAIL_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  kindOf,
  image{
    ...,
    "alt": ${IMAGE_ALT}
  },
  facts[]{
    _type,
    label,
    value,
    text
  },
  "property": property->{
    _id,
    title,
    "slug": slug.current,
    valuesPerItem
  }
}`;

/**
 * Public customization library (PROD-1288 facets).
 * Gate is HAS_DETAIL_PAGE (PROD-2732) — the two `appearsIn` values that carry a page.
 * Configurator pickability is the other axis of the same field and is orthogonal to
 * library membership: an option can be picked without a page, and have a page without
 * being pickable.
 */
export const CATALOG_CUSTOMIZATION_LIBRARY_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  ${HAS_DETAIL_PAGE} &&
  ${OPTION_ACTIVE} &&
  defined(slug.current)
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  status,
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${OPTION_CARD_IMAGE},
  media[0...1]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${FEATURED_VIDEO_URL_FIELD},
  "category": type->category->${CATEGORY_PROJ},
  "type": type->{
    _id,
    title,
    "slug": slug.current,
    "declaredProperties": properties[].property->{
      _id,
      title,
      "slug": slug.current
    }
  },
  "properties": properties[]->${PROPERTY_VALUE_PROJ},
  ${PRODUCT_LINES_FROM_PRODUCTS}
}`;

/** Single library option by category + handle slugs (PROD-2456). Same detail-page gate as the library list. */
export const CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  ${HAS_DETAIL_PAGE} &&
  ${OPTION_ACTIVE} &&
  slug.current == $handle &&
  type->category->slug.current == $category
][0]{
  _id,
  title,
  "slug": slug.current,
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${OPTION_CARD_IMAGE},
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${FEATURED_VIDEO_URL_FIELD},
  "category": type->category->${CATEGORY_PROJ},
  "type": type->{
    _id,
    title,
    "slug": slug.current,
    "declaredProperties": properties[].property->{
      _id,
      title,
      "slug": slug.current
    }
  },
  "properties": properties[]->${PROPERTY_VALUE_PROJ},
  ${PRODUCT_LINES_FROM_PRODUCTS}
}`;

/**
 * Peer / compare-slot projection for the detail page (PROD-1534).
 * Same stated-property shape as the current option; no FAQs or product lines.
 */
const CUSTOMIZATION_COMPARE_PEER_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "category": type->category->${CATEGORY_PROJ},
  "type": type->{
    _id,
    title,
    "slug": slug.current,
    "declaredProperties": properties[]{
      usage,
      showOnDetailPage,
      "property": property->{
        _id,
        title,
        "slug": slug.current,
        valuesPerItem
      }
    }
  },
  "properties": properties[]->${PROPERTY_VALUE_DETAIL_PROJ}
}`;

/**
 * Customization detail page (PROD-1299). Same detail-page gate; richer property + copy fields.
 * Same-category peers seed the detail compare band (PROD-1534).
 */
export const CATALOG_CUSTOMIZATION_DETAIL_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  ${HAS_DETAIL_PAGE} &&
  ${OPTION_ACTIVE} &&
  slug.current == $handle &&
  type->category->slug.current == $category
][0]{
  _id,
  status,
  title,
  "slug": slug.current,
  shortDescription,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "glossaryDefinition": glossaryTerm->definition,
  "benefitsTitle": benefits.title,
  "benefitsPlain": pt::text(benefits.body),
  "benefitsBody": benefits.body,
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${FEATURED_VIDEO_URL_FIELD},
  "specSheetUrl": specSheet.asset->url,
  "category": type->category->${CATEGORY_PROJ},
  "type": type->{
    _id,
    title,
    "slug": slug.current,
    "declaredProperties": properties[]{
      usage,
      showOnDetailPage,
      "property": property->{
        _id,
        title,
        "slug": slug.current,
        valuesPerItem
      }
    }
  },
  "properties": properties[]->${PROPERTY_VALUE_DETAIL_PROJ},
  ${PRODUCT_LINES_FROM_PRODUCTS},
  "faqs": faqs[]{
    "question": select(
      _type == "faqItem" => question,
      defined(@->question) => @->question
    ),
    "answer": select(
      _type == "faqItem" => answer,
      defined(@->answer) => @->answer
    ),
    "answerPlain": select(
      _type == "faqItem" => pt::text(answer),
      defined(@->answer) => pt::text(@->answer)
    )
  },
  "showcaseFromCaseStudies": *[
    _type == "caseStudy" &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    ^._id in capabilities[]._ref
  ] | order(publishedAt desc) [0...6] {
    title,
    "slug": slug.current,
    cardSummary,
    "src": coalesce(cardImage.asset->url, heroMedia.image.asset->url),
    "alt": coalesce(cardImageAlt, heroMedia.alt, title)
  },
  "showcaseFromSolutions": *[
    _type == "product" &&
    ${PRODUCT_ORDERABLE} &&
    ^._id in availableCustomizations[].customization._ref
  ].solutions[@->status == "active"]->{
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    "src": featuredImage.asset->url,
    "alt": title
  },
  "peers": *[
    _type == "customizationOption" &&
    ${HAS_DETAIL_PAGE} &&
    ${OPTION_ACTIVE} &&
    defined(slug.current) &&
    slug.current != $handle &&
    type->category->slug.current == $category
  ] | order(title asc) ${CUSTOMIZATION_COMPARE_PEER_PROJ}
}`;

/**
 * Everything `@pakfactory/sanity/customization-rules` computes from (PROD-2556), in one fetch:
 * every type (who decides it, how many a customer picks, its requirements) and every active
 * option (its type and compatible options, plus the display fields the builder shows). The
 * rules need ALL types — a category requirement expands to its member types — and every
 * active option, configurable or not, because a reference option can still be a partner.
 *
 * `requirements` reads `dependsOn` in either shape: `[{anyOf: [ref]}]` (PROD-2595) or an old
 * flat reference, which is a requirement of one. Large (every compatible pair), so www caches
 * it server-side and never sends it to the browser whole.
 */
export const CATALOG_CUSTOMIZATION_RULES_QUERY = /* groq */ `{
  "types": *[_type == "customizationType" && !(_id in path("drafts.**"))]{
    _id,
    title,
    availabilityDecidedBy,
    customerSelects,
    "categoryId": category._ref,
    "requirements": dependsOn[]{ "refs": coalesce(anyOf[]._ref, [_ref]) }.refs
  },
  "options": *[
    _type == "customizationOption" &&
    !(_id in path("drafts.**")) &&
    ${OPTION_ACTIVE}
  ]{
    ${OPTION_FIELDS},
    "typeId": type._ref,
    "compatibleCustomizations": coalesce(compatibleCustomizations[]._ref, [])
  }
}`;

/**
 * Option by id for builder Property controllers — no detail-page gate (configurable
 * Options may not have a library page).
 */
export const CATALOG_OPTION_BY_ID_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  _id == $id &&
  ${OPTION_ACTIVE}
][0]{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "category": type->category->${CATEGORY_PROJ},
  "type": type->{
    _id,
    title,
    "slug": slug.current,
    "declaredProperties": properties[]{
      usage,
      showOnDetailPage,
      "property": property->{
        _id,
        title,
        "slug": slug.current,
        valuesPerItem
      }
    }
  },
  "properties": properties[]->${PROPERTY_VALUE_DETAIL_PROJ},
  ${ACHIEVED_BY_PROJ},
  ${PRODUCT_LINES_FROM_PRODUCTS},
  "faqs": faqs[]{
    "question": select(
      _type == "faqItem" => question,
      defined(@->question) => @->question
    ),
    "answer": select(
      _type == "faqItem" => answer,
      defined(@->answer) => @->answer
    ),
    "answerPlain": select(
      _type == "faqItem" => pt::text(answer),
      defined(@->answer) => pt::text(@->answer)
    )
  }
}`;

export type CatalogCategoryDoc = {
  _id: string;
  title: string;
  slug: string | null;
  /** Retired on www (policy sortIndex); kept optional for older projections. */
  order?: number | null;
  description?: string | null;
  /**
   * Curated order of this category's TYPES, as ids (PROD-2740). Partial by design
   * and usually empty. Pass to `orderTypesInCategory` from
   * `@pakfactory/sanity/customization-type-order` — it drops ids whose type was
   * deleted (the refs are weak) and sorts whatever is unlisted alphabetically.
   */
  typeOrder?: string[];
};

export type CatalogTypeDoc = {
  _id: string;
  title: string;
  slug: string | null;
  customerSelects?: 'one' | 'many' | null;
  /** Deprecated — prefer customerSelects. */
  cardinality?: 'one' | 'many' | null;
  description?: string | null;
  /**
   * Curated order of this type's OPTIONS, as ids (PROD-2748 / PROD-2775).
   * Partial by design. Pass to `orderOptionsInType` from
   * `@pakfactory/sanity/option-order`.
   */
  optionOrder?: string[];
  category: CatalogCategoryDoc | null;
};

/** Technical option that can deliver a customer-facing option (reverse of `achieves`). */
export type CatalogAchievedByDoc = {
  _id: string;
  title: string;
  slug: string | null;
  typeTitle?: string | null;
  categorySlug?: string | null;
  /** PROD-2732 — the two page-bearing values are what make a "learn more" link. */
  appearsIn?:
    | 'configurable-with-page'
    | 'not-configurable-with-page'
    | 'configurable-no-page'
    | null;
  /** Customer-facing blurb — never metaDescription. */
  shortDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  featuredImage?: unknown | null;
  media?: unknown[] | null;
};

export type CatalogOptionDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  /** PROD-2732 — replaces `configuratorRole` + `hasPage`. May be absent on an un-backfilled document. */
  appearsIn?:
    | 'configurable-with-page'
    | 'not-configurable-with-page'
    | 'configurable-no-page'
    | null;
  /** House short description for cards / builder (PROD-2762). */
  shortDescription?: string | null;
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  /** Featured image first for PDP cards (PROD-2774 / ADR-023). */
  featuredImage?: unknown | null;
  media?: unknown[] | null;
  type: CatalogTypeDoc | null;
  /** Reverse of `achieves` — candidates that can deliver this option (PROD-2629). */
  achievedBy?: CatalogAchievedByDoc[] | null;
};

/** {@link CATALOG_CUSTOMIZATION_RULES_QUERY} — the rules catalog (PROD-2556). */
export type CatalogRulesTypeDoc = {
  _id: string;
  title?: string | null;
  availabilityDecidedBy?: 'product' | 'customization' | null;
  customerSelects?: 'one' | 'many' | null;
  categoryId?: string | null;
  /** One entry per requirement: its category / type refs. */
  requirements?: (string | null)[][] | null;
};

export type CatalogRulesOptionDoc = CatalogOptionDoc & {
  typeId?: string | null;
  compatibleCustomizations?: (string | null)[] | null;
};

export type CatalogCustomizationRulesDoc = {
  types: CatalogRulesTypeDoc[] | null;
  options: CatalogRulesOptionDoc[] | null;
};

/** What a product is resolved from: a preset's come from its `basedOn` product. */
export type CatalogRulesProductDoc = {
  available?: (string | null)[] | null;
  exceptions?: { optionId?: string | null; mode?: 'add' | 'remove' | null; reason?: string | null }[] | null;
};

export type CatalogAvailableCustomizationDoc = {
  preselected?: boolean | null;
  customization: CatalogOptionDoc | null;
};

export type CatalogLineRefDoc = {
  _id: string;
  title: string;
  slug: string | null;
  cardSummary?: string | null;
  description?: string | null;
  cardImage?: unknown | null;
};

export type CatalogStyleRefDoc = {
  _id: string;
  title: string;
  slug: string | null;
  shortDescription?: string | null;
  description?: string | null;
  cardImage?: unknown | null;
  /** The style's own FAQs (line query only). */
  faqs?: CatalogProductFaqDoc[] | null;
};

export type CatalogProductPropertyDoc = {
  label?: string | null;
  values?: (string | null)[] | null;
};

/** Facet-ready property row on the product library query (PROD-1845). */
export type CatalogProductLibraryPropertyDoc = {
  property?: CatalogPropertyRefDoc | null;
  values?: (CatalogPropertyValueDoc | null)[] | null;
};

/** Industry solution ref on the product library query. */
export type CatalogProductLibraryIndustryDoc = {
  title?: string | null;
  slug?: string | null;
};

/** Slug + title only — library / preview membership (PROD-2843). */
export type CatalogProductLibraryStyleDoc = {
  title?: string | null;
  slug?: string | null;
};

export type CatalogProductLibraryDoc = CatalogProductDoc & {
  libraryProperties?: CatalogProductLibraryPropertyDoc[] | null;
  industries?: (CatalogProductLibraryIndustryDoc | null)[] | null;
};

export type CatalogProductFaqDoc = {
  question?: string | null;
  /** Portable Text blocks for rich FAQ answers (bold, links). */
  answer?: unknown[] | null;
  answerPlain?: string | null;
};

export type CatalogProductDoc = {
  _id: string;
  title: string;
  slug: string | null;
  sku?: string | null;
  kind?: 'standard' | 'inspiration' | null;
  status?: string | null;
  description?: string | null;
  moq?: number | null;
  dimensionInput?: string | null;
  dimensionRange?: {
    lengthMin?: number | null;
    lengthMax?: number | null;
    widthMin?: number | null;
    widthMax?: number | null;
    heightMin?: number | null;
    heightMax?: number | null;
    diameterMin?: number | null;
    diameterMax?: number | null;
    gussetMin?: number | null;
    gussetMax?: number | null;
    dropMin?: number | null;
    dropMax?: number | null;
    /** Legacy Studio depth → treated as height. */
    depthMin?: number | null;
    depthMax?: number | null;
  } | null;
  /**
   * First industry solution (fallback: solutions[0]) for inspiration PDP crumbs.
   */
  breadcrumbParent?: {
    title?: string | null;
    slug?: string | null;
  } | null;
  /** Which PDP crumbs have a page to link to (CATALOG_PRODUCT_FIELDS only). */
  breadcrumbLinks?: {
    line?: boolean | null;
    style?: boolean | null;
    parent?: boolean | null;
  } | null;
  /** PDP by-slug only — Solution Style breadcrumb membership (PROD-2763). */
  productLineId?: string | null;
  productStyleIds?: (string | null)[] | null;
  solutionIds?: (string | null)[] | null;
  /** Hover-play video URL from `featuredVideo` (upload/URL); empty for YouTube-only. */
  featuredVideoUrl?: string | null;
  /** Direct public GLB URL from `model3d.url`; null when unset. */
  model3dUrl?: string | null;
  /** Optional glTF clip name for open/close control. */
  model3dAnimationName?: string | null;
  /** Card + PDP — gallery slides use media first, then featuredImage. */
  featuredImage?: unknown | null;
  media?: unknown[] | null;
  productLine: CatalogLineRefDoc | null;
  productStyle: CatalogStyleRefDoc | null;
  /**
   * Listed styles in Sanity order (library + line standard preview).
   * Membership for catalog facets / style pages / style-card image fallback (PROD-2843).
   * Display / breadcrumb / FAQs still use `productStyle` (primary).
   */
  productStyles?: (CatalogProductLibraryStyleDoc | null)[] | null;
  availableCustomizations?: CatalogAvailableCustomizationDoc[] | null;
  /** PDP by-slug only (PROD-2556): the rules inputs, and the product's own pre-selections. */
  rulesProduct?: CatalogRulesProductDoc | null;
  preselectedIds?: (string | null)[] | null;
  /** PDP by-slug / standard preview projection. */
  properties?: CatalogProductPropertyDoc[] | null;
  /**
   * Industry solutions on the product (line inspiration band / library).
   * Card fields only expose breadcrumbParent (first industry).
   */
  industries?: (CatalogProductLibraryIndustryDoc | null)[] | null;
  faqs?: CatalogProductFaqDoc[] | null;
  relatedProducts?: CatalogProductDoc[] | null;
  /** PDP sections (content). Merged with `template.sections` when set. */
  sections?: PageSectionDoc[] | null;
  template?: {
    _id?: string | null;
    sections?: PageSectionDoc[] | null;
  } | null;
};

export type CatalogProductLineExpertiseDoc = {
  _id: string;
  title: string;
  slug: string | null;
  description?: string | null;
  diagram?: unknown | null;
};

export type CatalogProductLineStudyDoc = {
  _id: string;
  title: string;
  slug: string | null;
  cardSummary?: string | null;
  cardImageUrl?: string | null;
  cardImageAlt?: string | null;
};

export type CatalogProductLineRelatedDoc = {
  _id: string;
  title: string;
  slug: string | null;
  shortDescription?: string | null;
  cardImage?: unknown | null;
};

export type CatalogProductLineDoc = {
  _id: string;
  title: string;
  slug: string | null;
  h1?: string | null;
  shortName?: string | null;
  shortDescription?: string | null;
  /** Plain text from `pt::text(description)`. */
  description?: string | null;
  /** Featured image cascade: featuredImage → cardImage → heroMedia. */
  cardImage?: unknown | null;
  /** Desktop scroll-scrub hero video URL from `featuredVideo` (upload/URL). */
  featuredVideoUrl?: string | null;
  /** Featured icon (CMS field name `kitMark`). */
  kitMark?: unknown | null;
  media?: unknown[] | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  expertise?: (CatalogProductLineExpertiseDoc | null)[] | null;
  featuredStudies?: (CatalogProductLineStudyDoc | null)[] | null;
  featuredProducts?: CatalogProductDoc[] | null;
  relatedLines?: (CatalogProductLineRelatedDoc | null)[] | null;
  faqs?: CatalogProductFaqDoc[] | null;
  sections?: PageSectionDoc[] | null;
  template?: {
    _id?: string | null;
    /** Hero chrome from the selected Product Line Page layout: `stack` | `bottomBar`. */
    heroLayout?: string | null;
    sections?: PageSectionDoc[] | null;
  } | null;
  styles?: CatalogStyleRefDoc[] | null;
  products?: CatalogProductDoc[] | null;
  /** Inspiration-kind products for this line (Inspiration section). */
  inspirationProducts?: CatalogProductDoc[] | null;
};

export type CatalogPropertyRefDoc = {
  _id: string;
  title: string;
  slug: string | null;
};

export type CatalogPropertyValueDoc = {
  _id: string;
  title: string;
  slug: string | null;
  property: CatalogPropertyRefDoc | null;
};

export type CatalogLibraryTypeDoc = {
  _id: string;
  title: string;
  slug: string | null;
  declaredProperties?: (CatalogPropertyRefDoc | null)[] | null;
};

export type CatalogLibraryOptionDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  /** Role-named Featured image (ADR-023). */
  featuredImage?: unknown | null;
  /** Featured image coalesce for rest thumb fallback. */
  cardImage?: unknown | null;
  /** Sanity `media` only (not Featured) — card hover uses [1] when present. */
  media?: unknown[] | null;
  /** Playable MP4/MOV from Featured video; YouTube → null. */
  featuredVideoUrl?: string | null;
  category: CatalogCategoryDoc | null;
  type?: CatalogLibraryTypeDoc | null;
  properties?: (CatalogPropertyValueDoc | null)[] | null;
  productLines?: (CatalogLineRefDoc | null)[] | null;
};

export type CatalogPropertyValueDetailDoc = {
  _id: string;
  title: string;
  slug: string | null;
  kindOf?: unknown | null;
  image?: unknown | null;
  facts?:
    | {
        _type?: string | null;
        label?: string | null;
        value?: number | null;
        text?: string | null;
      }[]
    | null;
  property: (CatalogPropertyRefDoc & {
    valuesPerItem?: 'one' | 'many' | null;
  }) | null;
};

export type CatalogDeclaredPropertyDoc = {
  usage?: 'stated' | 'selectable' | null;
  property: (CatalogPropertyRefDoc & {
    valuesPerItem?: 'one' | 'many' | null;
  }) | null;
  /** Stated rows only (PROD-2610): false = a filter the detail page does not print. Unset = shown. */
  showOnDetailPage?: boolean | null;
};

/** Peer option for detail compare (no FAQs / product lines). */
export type CatalogCustomizationComparePeerDoc = {
  _id: string;
  title: string;
  slug: string | null;
  shortDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  featuredImage?: unknown | null;
  media?: unknown[] | null;
  category: CatalogCategoryDoc | null;
  type?: {
    _id: string;
    title: string;
    slug: string | null;
    declaredProperties?: (CatalogDeclaredPropertyDoc | null)[] | null;
  } | null;
  properties?: (CatalogPropertyValueDetailDoc | null)[] | null;
};

/** Showcase tile from case study / solution reverse joins (PROD-1299). */
export type CatalogShowcaseImageDoc = {
  _id?: string | null;
  title?: string | null;
  slug?: string | null;
  /** Case study card summary / solution short description. */
  cardSummary?: string | null;
  shortDescription?: string | null;
  src?: string | null;
  alt?: string | null;
};

export type CatalogCustomizationDetailDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  shortDescription?: string | null;
  /** SEO only — never map into customer-facing body copy. */
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  /** Portable Text from linked glossaryTerm.definition (PROD-2779). */
  glossaryDefinition?: unknown[] | null;
  benefitsTitle?: string | null;
  benefitsPlain?: string | null;
  benefitsBody?: unknown[] | null;
  featuredImage?: unknown | null;
  media?: unknown[] | null;
  /** Playable MP4/WebM/MOV URL from `featuredVideo` (upload/url); YouTube → null. */
  featuredVideoUrl?: string | null;
  /** Optional PDF upload on Specs — CDN URL when set. */
  specSheetUrl?: string | null;
  category: CatalogCategoryDoc | null;
  type?: {
    _id: string;
    title: string;
    slug: string | null;
    declaredProperties?: (CatalogDeclaredPropertyDoc | null)[] | null;
  } | null;
  properties?: (CatalogPropertyValueDetailDoc | null)[] | null;
  productLines?: (CatalogLineRefDoc | null)[] | null;
  faqs?: (CatalogProductFaqDoc | null)[] | null;
  /** Case studies that tag this option (`capabilities`). */
  showcaseFromCaseStudies?: (CatalogShowcaseImageDoc | null)[] | null;
  /** Solutions via products that offer this option. */
  showcaseFromSolutions?: (CatalogShowcaseImageDoc | null)[] | null;
  /** Same-category library options for the compare band (PROD-1534). */
  peers?: (CatalogCustomizationComparePeerDoc | null)[] | null;
};
