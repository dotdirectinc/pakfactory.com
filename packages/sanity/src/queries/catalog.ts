/**
 * Catalog GROQ for the www rebuild F1a seam.
 * Field names mirror live Studio schemas (product / productLine / productStyle /
 * customizationCategory / customizationType / customizationOption). Do not bend
 * these projections to retired productPage / handle shapes.
 */

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

/**
 * Card thumbnail.
 *
 * Style: `image` is its only image since PROD-2511 renamed `cardImage` and
 * dropped `hero` (a card is a render slot, not a field name). `cardImage` stays
 * as a fallback for the one legacy value until it is unset; `hero.image` was
 * empty on every style and is gone. The projection key stays `cardImage`
 * because it names what the consumer renders, not the schema field.
 *
 * Line: unchanged, `cardImage` → `heroMedia`.
 */
const STYLE_CARD_IMAGE = /* groq */ `"cardImage": coalesce(image, cardImage){
  ...,
  "alt": ${IMAGE_ALT}
}`;

const LINE_CARD_IMAGE = /* groq */ `"cardImage": coalesce(cardImage, heroMedia){
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

const COMPAT_REF_IDS = /* groq */ `coalesce(worksOnCustomizations[]._ref, [])`;
const INCOMPAT_REF_IDS = /* groq */ `coalesce(incompatibleWithCustomizations[]._ref, [])`;

const OPTION_PROJ = /* groq */ `{
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
  "worksOnIds": ${COMPAT_REF_IDS},
  "incompatibleIds": ${INCOMPAT_REF_IDS},
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "type": type->${TYPE_PROJ}
}`;

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

/** PDP-only extras: specs properties, FAQs, curated related (PROD-1913). */
export const CATALOG_PRODUCT_PDP_FIELDS = /* groq */ `
  ${CATALOG_PRODUCT_FIELDS},
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
  "description": coalesce(shortDescription, pt::text(description)),
  moq,
  leadTimeDays,
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
  "productStyle": coalesce(productStyle[0], basedOn->productStyle[0])->${STYLE_REF_PROJ},
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

export const CATALOG_PRODUCT_LINES_QUERY = /* groq */ `*[
  _type == "productLine" &&
  defined(slug.current)
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  cardSummary,
  "description": coalesce(cardSummary, pt::text(intro)),
  ${LINE_CARD_IMAGE},
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
}`;

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
 * Customization detail page (PROD-1299). Same hasPage gate; richer property + copy fields.
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
  }
}`;

/**
 * Active configurable options in derived categories (finishing / printing).
 * Used by www to expand product offers via worksOn / incompatibleWith (PROD-2529).
 */
export const CATALOG_DERIVED_CUSTOMIZATION_OPTIONS_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  status == "active" &&
  coalesce(configuratorRole, role) == "configurable" &&
  type->category->slug.current in $categorySlugs
] | order(title asc) {
  ${OPTION_PROJ}
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
  worksOnIds?: (string | null)[] | null;
  incompatibleIds?: (string | null)[] | null;
  media?: unknown[] | null;
  type: CatalogTypeDoc | null;
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
  /** PDP by-slug only (PROD-1913). */
  properties?: CatalogProductPropertyDoc[] | null;
  faqs?: CatalogProductFaqDoc[] | null;
  relatedProducts?: CatalogProductDoc[] | null;
};

export type CatalogProductLineDoc = {
  _id: string;
  title: string;
  slug: string | null;
  cardSummary?: string | null;
  description?: string | null;
  cardImage?: unknown | null;
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
};
