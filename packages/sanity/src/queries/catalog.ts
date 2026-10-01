/**
 * Catalog GROQ for the www rebuild F1a seam.
 * Field names mirror live Studio schemas (product / productLine / productStyle /
 * customizationCategory / customizationType / customizationOption). Do not bend
 * these projections to retired productPage / handle shapes.
 */

import {
  PAGE_SECTIONS_PROJECTION,
  FEATURED_VIDEO_URL_FIELD,
  type PageSectionDoc,
} from './sections';

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
  status == "active" &&
  ^._id in achieves[]._ref
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  "typeTitle": type->title,
  "categorySlug": type->category->slug.current,
  appearsIn,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

const OPTION_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  status,
  appearsIn,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "type": type->${TYPE_PROJ},
  ${ACHIEVED_BY_PROJ}
`;

/**
 * `customerFacing: false` = "no page, no route, no listing; the document exists only to be
 * referenced" (the field's own description on product / productLine / productStyle). Notion's
 * "Hidden" sets it, and from 2026-09-28 every catalog document is PUBLISHED — so this, not the
 * draft state, is what keeps a hidden product, line or style off the site. A missing value is
 * customer-facing (`null != false`).
 */
export const CUSTOMER_FACING = /* groq */ `customerFacing != false`;

/**
 * Lifecycle (Richard's baseline, 2026-09-28 — PROD-2605). Products, lines, styles and
 * solutions only — customization options are Active / Not active (PROD-2733) and test
 * `status == "active"` directly. With customer facing on:
 *   active        normal — page, listed, orderable
 *   coming-soon   page that says "coming soon", LISTED with a badge, not orderable
 *   discontinued  page still exists (indexable, "no longer available"), NOT listed, not orderable
 * An unset status reads as active. The configurator only ever offers active options.
 */
export const LISTED_STATUS = /* groq */ `(!defined(status) || status in ["active", "coming-soon"])`;
export const HAS_PAGE_STATUS = /* groq */ `(!defined(status) || status in ["active", "coming-soon", "discontinued"])`;

/**
 * A customization option with its own detail page in the library (PROD-2732).
 * Replaces `hasPage == true`, which merged into `appearsIn`.
 *
 * 🔴 Names the two values that DO have a page rather than excluding the one that
 * does not. An option whose `appearsIn` is unset — an import that has not run the
 * backfill, an API write — must read as "no page", and `appearsIn != "…-no-page"`
 * is the opposite expression for a missing value.
 *
 * ⚠️ Customization options no longer use LISTED_STATUS or HAS_PAGE_STATUS above.
 * Their status is Active / Not active only (PROD-2733), so they test
 * `status == "active"` directly. Those two constants belong to the product,
 * line, style and solution family, which keeps all three lifecycle values.
 */
export const HAS_DETAIL_PAGE = /* groq */ `appearsIn in ["configurable-with-page", "not-configurable-with-page"]`;

/**
 * Product LINES and STYLES are grouping pages, not products (PROD-2620; coming-soon
 * tightened 2026-09-29): `discontinued` and `coming-soon` are HIDDEN — no page, no route,
 * no listing — same as `customerFacing: false`. Products still use {@link LISTED_STATUS}
 * so a coming-soon *product* can list with a badge. Unset status reads as active.
 * A style's page exists only while its line lists it (`getStyle` in www), so the `styles`
 * list below is also the style route gate.
 */
export const LINE_STYLE_ACTIVE = /* groq */ `(!defined(status) || status == "active")`;
export const LINE_STYLE_VISIBLE = /* groq */ `${LINE_STYLE_ACTIVE} && ${CUSTOMER_FACING}`;

const OPTION_PROJ = /* groq */ `{${OPTION_FIELDS}}`;

/** Product lines that offer this option (PROD-2529 reverse of availableCustomizations). */
const PRODUCT_LINES_FROM_PRODUCTS = /* groq */ `"productLines": *[
  _type == "product" &&
  (status == "active" || !defined(status)) &&
  ${CUSTOMER_FACING} &&
  ^._id in availableCustomizations[].customization._ref &&
  // Never offer a line whose page is gone (PROD-2620). Tested on the product, not by filtering
  // \`.line\` afterwards: \`{…}.line[cond]\` applies the filter to each line object, not the list.
  !(coalesce(productLine, basedOn->productLine)->status in ["discontinued", "coming-soon"]) &&
  coalesce(productLine, basedOn->productLine)->customerFacing != false
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

/** One FAQ as the catalog pages render it. Blocks for UI; plain for JSON-LD. */
const FAQ_ITEM_PROJ = /* groq */ `{
    question,
    answer,
    "answerPlain": pt::text(answer)
  }`;

/**
 * A product's FAQs, inherited down the catalog: product → its style → its line (Richard,
 * 2026-09-28). The nearest level with ANY FAQ wins outright — one curated FAQ on a product
 * replaces everything above it, nothing merges. A preset reads its style and line through
 * `basedOn`, as the card fields do. The style is the product's first (`productStyle[0]`), the
 * one its card shows; the line is the product's own, falling back to that style's line.
 */
const PRODUCT_FAQS_INHERITED = /* groq */ `"faqs": select(
    count(faqs) > 0 => faqs[]->${FAQ_ITEM_PROJ},
    count(coalesce(productStyle[0], basedOn->productStyle[0])->faqs) > 0 =>
      coalesce(productStyle[0], basedOn->productStyle[0])->faqs[]->${FAQ_ITEM_PROJ},
    coalesce(
      productLine,
      basedOn->productLine,
      coalesce(productStyle[0], basedOn->productStyle[0])->productLine
    )->faqs[]->${FAQ_ITEM_PROJ}
  )`;

/** Shared product projection used by by-slug and list queries. */
export const CATALOG_PRODUCT_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  sku,
  kind,
  status,
  "description": coalesce(pt::text(description), shortDescription),
  moq,
  dimensionInput,
  dimensionRange,
  "primarySolution": primarySolution->slug.current,
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
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": coalesce(productLine, basedOn->productLine)->${LINE_REF_PROJ},
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_REF_PROJ},
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
  status,
  "description": coalesce(shortDescription, pt::text(description)),
  moq,
  ${PRODUCT_FEATURED_VIDEO},
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": coalesce(productLine, basedOn->productLine)->${LINE_REF_PROJ},
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_REF_PROJ}
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
  "rulesProduct": select(
    kind == "inspiration" && defined(basedOn) => basedOn->${RULES_PRODUCT_PROJ},
    ${RULES_PRODUCT_PROJ}
  ),
  "preselectedIds": coalesce(availableCustomizations[preselected == true].customization._ref, []),
  "properties": properties[defined(property)]{
    "label": property->title,
    "values": values[]->title
  },
  ${PRODUCT_FAQS_INHERITED},
  "relatedProducts": relatedProducts[]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  },
  "sections": sections[]${PAGE_SECTIONS_PROJECTION},
  "template": template->{
    _id,
    "sections": sections[]${PAGE_SECTIONS_PROJECTION}
  }
`;

/** Active (or unset status) products for catalog index / params. */
export const CATALOG_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${LISTED_STATUS} &&
  ${CUSTOMER_FACING}
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
  status,
  moq,
  media[0...1]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": *[
    _id == coalesce(^.productLine._ref, ^.basedOn->productLine._ref) &&
    ${LINE_STYLE_VISIBLE}
  ][0]{
    _id,
    title,
    "slug": slug.current,
    cardSummary,
    "description": coalesce(cardSummary, pt::text(intro)),
    ${LINE_CARD_IMAGE}
  },
  "productStyle": *[
    _id == coalesce(^.productStyle[0]._ref, ^.basedOn->productStyle[0]._ref) &&
    ${LINE_STYLE_VISIBLE}
  ][0]${STYLE_LIBRARY_REF_PROJ},
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
  ${LISTED_STATUS} &&
  ${CUSTOMER_FACING}
] | order(title asc) {
  ${CATALOG_PRODUCT_LIBRARY_FIELDS}
}`;

export const CATALOG_PRODUCT_BY_SLUG_QUERY = /* groq */ `*[
  _type == "product" &&
  slug.current == $slug &&
  ${HAS_PAGE_STATUS} &&
  ${CUSTOMER_FACING}
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
 * A style that is listed but no longer visible (discontinued, not customer-facing)
 * is filtered by the same LINE_STYLE_VISIBLE the tail uses, so the two tiers agree.
 */
const LINE_STYLES = /* groq */ `(
    coalesce(
      (styleOrder[]->)[defined(_id) && ${LINE_STYLE_VISIBLE}]${LINE_STYLE_CARD_PROJ},
      []
    )
    + *[
        _type == "productStyle" &&
        productLine._ref == ^._id &&
        ${LINE_STYLE_VISIBLE} &&
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
  "products": *[_type == "product" && (
    productLine._ref == ^._id ||
    basedOn->productLine._ref == ^._id
  ) && defined(slug.current) && ${LISTED_STATUS} && ${CUSTOMER_FACING}] | order(title asc) {
    ${CATALOG_PRODUCT_CARD_FIELDS}
  }
`;

export const CATALOG_PRODUCT_LINES_QUERY = /* groq */ `*[
  _type == "productLine" &&
  defined(slug.current) &&
  ${LINE_STYLE_VISIBLE}
] | order(title asc) {
  ${CATALOG_PRODUCT_LINE_FIELDS}
}`;

export const CATALOG_PRODUCT_LINE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "productLine" &&
  slug.current == $slug &&
  ${LINE_STYLE_VISIBLE}
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
  ${LINE_STYLE_VISIBLE}
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
  status == "active" &&
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
  status == "active" &&
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
  status == "active" &&
  slug.current == $handle &&
  type->category->slug.current == $category
][0]{
  _id,
  status,
  title,
  "slug": slug.current,
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
  ${FEATURED_VIDEO_URL_FIELD},
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
  "peers": *[
    _type == "customizationOption" &&
    ${HAS_DETAIL_PAGE} &&
    status == "active" &&
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
    status == "active"
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
  status == "active"
][0]{
  _id,
  title,
  "slug": slug.current,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
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
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
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
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
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
  primarySolution?: string | null;
  /**
   * First industry solution (fallback: solutions[0]) for inspiration PDP crumbs.
   */
  breadcrumbParent?: {
    title?: string | null;
    slug?: string | null;
  } | null;
  /** Hover-play video URL from `featuredVideo` (upload/URL); empty for YouTube-only. */
  featuredVideoUrl?: string | null;
  media?: unknown[] | null;
  productLine: CatalogLineRefDoc | null;
  productStyle: CatalogStyleRefDoc | null;
  availableCustomizations?: CatalogAvailableCustomizationDoc[] | null;
  /** PDP by-slug only (PROD-2556): the rules inputs, and the product's own pre-selections. */
  rulesProduct?: CatalogRulesProductDoc | null;
  preselectedIds?: (string | null)[] | null;
  /** PDP by-slug only (PROD-1913). */
  properties?: CatalogProductPropertyDoc[] | null;
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
  metaDescription?: string | null;
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

export type CatalogCustomizationDetailDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  featuredImage?: unknown | null;
  media?: unknown[] | null;
  /** Playable MP4/MOV URL from `featuredVideo` (upload/url); YouTube → null. */
  featuredVideoUrl?: string | null;
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
  /** Same-category library options for the compare band (PROD-1534). */
  peers?: (CatalogCustomizationComparePeerDoc | null)[] | null;
};
