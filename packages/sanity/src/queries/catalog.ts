/**
 * Catalog GROQ for the www rebuild F1a seam.
 * Field names mirror live Studio schemas (product / productLine / productStyle /
 * customizationCategory / customizationType / customizationOption). Do not bend
 * these projections to retired productPage / handle shapes.
 */

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

const CATEGORY_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  order,
  description
}`;

const TYPE_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  cardinality,
  description,
  "category": category->${CATEGORY_PROJ}
}`;

const OPTION_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  status,
  role,
  media[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "type": type->${TYPE_PROJ}
}`;

const LINE_REF_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  cardSummary,
  "description": coalesce(cardSummary, pt::text(intro))
}`;

const STYLE_REF_PROJ = /* groq */ `{
  _id,
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
  description,
  moq,
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

/** Active (or unset status) products for catalog index / params. */
export const CATALOG_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  (status == "active" || !defined(status))
] | order(title asc) {
  ${CATALOG_PRODUCT_FIELDS}
}`;

export const CATALOG_PRODUCT_BY_SLUG_QUERY = /* groq */ `*[
  _type == "product" &&
  slug.current == $slug &&
  (status == "active" || !defined(status) || status == "coming-soon")
][0]{
  ${CATALOG_PRODUCT_FIELDS}
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
  "styles": *[_type == "productStyle" && productLine._ref == ^._id] | order(title asc) {
    _id,
    title,
    "slug": slug.current
  },
  "products": *[_type == "product" && (
    productLine._ref == ^._id ||
    basedOn->productLine._ref == ^._id
  ) && defined(slug.current) && (status == "active" || !defined(status))] | order(title asc) {
    ${CATALOG_PRODUCT_FIELDS}
  }
}`;

/** Reference-role options for the public customization library. */
export const CATALOG_CUSTOMIZATION_LIBRARY_QUERY = /* groq */ `*[
  _type == "customizationOption" &&
  role == "reference" &&
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
  "category": type->category->${CATEGORY_PROJ}
}`;

export type CatalogCategoryDoc = {
  _id: string;
  title: string;
  slug: string | null;
  order?: number | null;
  description?: string | null;
};

export type CatalogTypeDoc = {
  _id: string;
  title: string;
  slug: string | null;
  cardinality?: 'one' | 'many' | null;
  description?: string | null;
  category: CatalogCategoryDoc | null;
};

export type CatalogOptionDoc = {
  _id: string;
  title: string;
  slug: string | null;
  status?: string | null;
  role?: 'configurable' | 'reference' | null;
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
};

export type CatalogStyleRefDoc = {
  _id: string;
  title: string;
  slug: string | null;
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
  dimensionRange?: {
    lengthMin?: number | null;
    lengthMax?: number | null;
    widthMin?: number | null;
    widthMax?: number | null;
    depthMin?: number | null;
    depthMax?: number | null;
  } | null;
  primarySolution?: string | null;
  media?: unknown[] | null;
  productLine: CatalogLineRefDoc | null;
  productStyle: CatalogStyleRefDoc | null;
  availableCustomizations?: CatalogAvailableCustomizationDoc[] | null;
};

export type CatalogProductLineDoc = {
  _id: string;
  title: string;
  slug: string | null;
  cardSummary?: string | null;
  description?: string | null;
  styles?: CatalogStyleRefDoc[] | null;
  products?: CatalogProductDoc[] | null;
};

export type CatalogLibraryOptionDoc = {
  _id: string;
  title: string;
  slug: string | null;
  media?: unknown[] | null;
  category: CatalogCategoryDoc | null;
};
