/**
 * Solutions GROQ for www rebuild — LPs at `/solutions/[slug]` and
 * pre-filtered catalogs at `/solutions/[slug]/[lineSlug]`.
 * Field names mirror `solution` / `product` / `productLine` Studio schemas.
 */

import {CATALOG_PRODUCT_CARD_FIELDS} from './catalog';

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

const RELATED_REF = /* groq */ `{
  title,
  "slug": slug.current
}`;

const FORMAT_REF = /* groq */ `{
  title,
  "slug": slug.current,
  cardSummary,
  "description": coalesce(cardSummary, pt::text(intro)),
  "cardImage": coalesce(cardImage, heroMedia){
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

/** Solution landing page by slug (caller gates on hasPage). */
export const SOLUTION_BY_SLUG_QUERY = /* groq */ `*[
  _type == "solution" &&
  slug.current == $slug
][0]{
  _id,
  title,
  h1,
  shortName,
  hasPage,
  "slug": slug.current,
  shortDescription,
  description,
  heroImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "packagingFormats": packagingFormats[]->${FORMAT_REF},
  "relatedProducts": relatedProducts[]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  },
  "relatedCaseStudies": relatedCaseStudies[]->${RELATED_REF},
  "relatedSolutions": relatedSolutions[]->${RELATED_REF},
  metaTitle,
  metaDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonicalUrl
}`;

/**
 * Active products tagged to a solution and belonging to a product line.
 * Used for `/solutions/[slug]/[lineSlug]`.
 */
export const SOLUTION_LINE_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  (status == "active" || !defined(status)) &&
  (
    primarySolution->slug.current == $solutionSlug ||
    $solutionSlug in solutions[]->slug.current
  ) &&
  coalesce(productLine, basedOn->productLine)->slug.current == $lineSlug
] | order(title asc) {
  ${CATALOG_PRODUCT_CARD_FIELDS}
}`;

/**
 * Active products tagged to a solution (LP related-products fallback).
 * Caps at 12; curated `relatedProducts` on the solution doc takes precedence.
 */
export const SOLUTION_TAGGED_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  (status == "active" || !defined(status)) &&
  (
    primarySolution->slug.current == $solutionSlug ||
    $solutionSlug in solutions[]->slug.current
  )
] | order(title asc) [0...12] {
  ${CATALOG_PRODUCT_CARD_FIELDS}
}`;

/** Slugs + formats for solutions that earn a landing page (static params). */
export const SOLUTION_PAGE_SLUGS_QUERY = /* groq */ `*[
  _type == "solution" &&
  hasPage == true &&
  defined(slug.current)
] | order(title asc) {
  "slug": slug.current,
  "packagingFormats": packagingFormats[]->{
    "slug": slug.current
  }
}`;

/** Index cards for solutions that earn a landing page. */
export const SOLUTIONS_WITH_PAGES_QUERY = /* groq */ `*[
  _type == "solution" &&
  hasPage == true &&
  defined(slug.current)
] | order(title asc) {
  title,
  h1,
  shortName,
  shortDescription,
  "slug": slug.current,
  heroImage{
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

import type {
    CatalogProductDoc,
} from './catalog';

export type SolutionRelatedRefDoc = {
    title: string;
    slug: string | null;
};

export type SolutionFormatRefDoc = {
    title: string;
    slug: string | null;
    cardSummary?: string | null;
    description?: string | null;
    cardImage?: unknown | null;
};

export type SolutionBySlugDoc = {
    _id: string;
    title: string;
    h1?: string | null;
    shortName?: string | null;
    hasPage?: boolean | null;
    slug: string | null;
    shortDescription?: string | null;
    description?: unknown[] | null;
    heroImage?: unknown | null;
    packagingFormats?: SolutionFormatRefDoc[] | null;
    relatedProducts?: CatalogProductDoc[] | null;
    relatedCaseStudies?: SolutionRelatedRefDoc[] | null;
    relatedSolutions?: SolutionRelatedRefDoc[] | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    allowIndex?: boolean | null;
    allowFollow?: boolean | null;
    noImageIndex?: boolean | null;
    canonicalUrl?: string | null;
};

export type SolutionPageSlugDoc = {
    slug: string | null;
    packagingFormats?: Array<{slug: string | null}> | null;
};

export type SolutionWithPageDoc = {
    title: string;
    h1?: string | null;
    shortName?: string | null;
    shortDescription?: string | null;
    slug: string | null;
    heroImage?: unknown | null;
};
