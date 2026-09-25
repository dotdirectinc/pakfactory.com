/**
 * Catalog GROQ for the www rebuild F1a seam.
 * Field names mirror live Studio schemas (product / productLine / productStyle /
 * customizationCategory / customizationType / customizationOption). Do not bend
 * these projections to retired productPage / handle shapes.
 */

import {
  PAGE_SECTIONS_PROJECTION,
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

const CATEGORY_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  description
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

const OPTION_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  status,
  configuratorRole,
  role,
  hasPage,
  metaDescription,
  "glossaryPlain": pt::text(glossaryTerm->definition),
  "benefitsPlain": pt::text(benefits.body),
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "type": type->${TYPE_PROJ}
`;

const OPTION_PROJ = /* groq */ `{${OPTION_FIELDS}}`;

/** Product lines that offer this option (PROD-2529 reverse of availableCustomizations). */
const PRODUCT_LINES_FROM_PRODUCTS = /* groq */ `"productLines": *[
  _type == "product" &&
  (status == "active" || !defined(status)) &&
  ^._id in availableCustomizations[].customization._ref
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
  leadTimeDays,
  dimensionInput,
  dimensionRange,
  "primarySolution": primarySolution->slug.current,
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
  leadTimeDays,
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
  "faqs": faqs[]->{
    question,
    "answerPlain": pt::text(answer)
  },
  "relatedProducts": relatedProducts[]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  }
`;

/** Active (or unset status) products for catalog index / params. */
export const CATALOG_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  (status == "active" || !defined(status))
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
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "productLine": coalesce(productLine, basedOn->productLine)->{
    _id,
    title,
    "slug": slug.current,
    cardSummary,
    "description": coalesce(cardSummary, pt::text(intro)),
    ${LINE_CARD_IMAGE}
  },
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_LIBRARY_REF_PROJ},
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
  (status == "active" || !defined(status))
] | order(title asc) {
  ${CATALOG_PRODUCT_LIBRARY_FIELDS}
}`;

export const CATALOG_PRODUCT_BY_SLUG_QUERY = /* groq */ `*[
  _type == "product" &&
  slug.current == $slug &&
  (status == "active" || !defined(status) || status == "coming-soon")
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

const LINE_KIT_MARK = /* groq */ `kitMark{
  ...,
  "alt": ${IMAGE_ALT}
}`;

/** Shared projection for list + single-line fetches (PROD-1914 landing). */
export const CATALOG_PRODUCT_LINE_FIELDS = /* groq */ `
  _id,
  title,
  h1,
  "slug": slug.current,
  shortDescription,
  "description": pt::text(description),
  ${LINE_FEATURED_IMAGE},
  ${LINE_KIT_MARK},
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
  "faqs": faqs[]->{
    question,
    "answerPlain": pt::text(answer)
  },
  "sections": sections[]${PAGE_SECTIONS_PROJECTION},
  "template": template->{
    _id,
    "sections": sections[]${PAGE_SECTIONS_PROJECTION}
  },
  "styles": *[_type == "productStyle" && productLine._ref == ^._id] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    "description": coalesce(pt::text(description), shortDescription),
    ${STYLE_CARD_IMAGE}
  },
  "products": *[_type == "product" && (
    productLine._ref == ^._id ||
    basedOn->productLine._ref == ^._id
  ) && defined(slug.current) && (status == "active" || !defined(status))] | order(title asc) {
    ${CATALOG_PRODUCT_CARD_FIELDS}
  }
`;

export const CATALOG_PRODUCT_LINES_QUERY = /* groq */ `*[
  _type == "productLine" &&
  defined(slug.current)
] | order(title asc) {
  ${CATALOG_PRODUCT_LINE_FIELDS}
}`;

export const CATALOG_PRODUCT_LINE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "productLine" &&
  slug.current == $slug
][0]{
  ${CATALOG_PRODUCT_LINE_FIELDS}
}`;

/**
 * Existence probe for `/products/[slug]` segment resolution.
 * Product clicks wait on this (not the full line landing document).
 */
export const CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY = /* groq */ `*[
  _type == "productLine" &&
  slug.current == $slug
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
 * Gate is `hasPage` (D55 / PROD-2482) — not deprecated `role == "reference"`.
 * Configurator pickability is `configuratorRole` and is orthogonal to library membership.
 */
export const CATALOG_CUSTOMIZATION_LIBRARY_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  hasPage == true &&
  status == "active" &&
  defined(slug.current)
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
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

/** Single library option by category + handle slugs (PROD-2456). Same `hasPage` gate as the library list. */
export const CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  hasPage == true &&
  status == "active" &&
  slug.current == $handle &&
  type->category->slug.current == $category
][0]{
  _id,
  title,
  "slug": slug.current,
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
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
 * Customization detail page (PROD-1299). Same hasPage gate; richer property + copy fields.
 * Same-category peers seed the detail compare band (PROD-1534).
 */
export const CATALOG_CUSTOMIZATION_DETAIL_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  hasPage == true &&
  status == "active" &&
  slug.current == $handle &&
  type->category->slug.current == $category
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
    "answerPlain": select(
      _type == "faqItem" => pt::text(answer),
      defined(@->answer) => pt::text(@->answer)
    )
  },
  "peers": *[
    _type == "customizationOption" &&
    hasPage == true &&
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
 * Option by id for builder Property controllers — no hasPage gate (configurable
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

export type CatalogOptionDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  configuratorRole?: 'configurable' | 'reference' | null;
  /** Deprecated — prefer configuratorRole. */
  role?: 'configurable' | 'reference' | null;
  hasPage?: boolean | null;
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  media?: unknown[] | null;
  type: CatalogTypeDoc | null;
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
  leadTimeDays?: number | null;
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
  shortDescription?: string | null;
  /** Plain text from `pt::text(description)`. */
  description?: string | null;
  /** Featured image cascade: featuredImage → cardImage → heroMedia. */
  cardImage?: unknown | null;
  /** Kit-mark icon above the landing H1. */
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
  media?: unknown[] | null;
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
};

/** Peer option for detail compare (no FAQs / product lines). */
export type CatalogCustomizationComparePeerDoc = {
  _id: string;
  title: string;
  slug: string | null;
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
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
  metaDescription?: string | null;
  glossaryPlain?: string | null;
  benefitsPlain?: string | null;
  media?: unknown[] | null;
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
