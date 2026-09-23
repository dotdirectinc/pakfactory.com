/**
 * Solutions GROQ for www rebuild — LPs at `/solutions/[slug]` and
 * pre-filtered catalogs at `/solutions/[slug]/[lineSlug]`.
 * Field names mirror `solution` / `product` / `productLine` Studio schemas.
 */

import {CATALOG_PRODUCT_CARD_FIELDS} from './catalog';
import {
    PAGE_SECTIONS_PROJECTION,
    type PageSectionDoc,
} from './sections';

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

const RELATED_REF = /* groq */ `{
  title,
  "slug": slug.current
}`;

/** Case-study card fields — same shape as caseStudiesRow curated items. */
const RELATED_CASE_STUDY_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "cardImageUrl": cardImage.asset->url,
  "cardImageAlt": coalesce(cardImageAlt, cardImage.asset->altText),
  "clientName": client->name,
  "tag": coalesce(products[0]->title, expertiseAreas[0]->title)
}`;

/** Same refs as relatedCaseStudies — shape for videoCaseStudiesRow inherit. */
const RELATED_VIDEO_CASE_STUDY_CARD = /* groq */ `{
  "kind": "ref",
  _id,
  _type,
  title,
  "slug": slug.current,
  "brand": client->name,
  "imageSrc": coalesce(
    cardImage.asset->url,
    heroMedia.videoThumbnail.asset->url
  ),
  "imageAlt": coalesce(cardImageAlt, cardImage.asset->altText, title),
  "logoSrc": client->logo.asset->url,
  "logoAlt": client->name,
  "videoSrc": null,
  "youtubeUrl": select(
    heroMedia.mediaType == "video" => heroMedia.videoUrl
  ),
  "metricTitle": highlights[0].title,
  "metricBody": highlights[0].description
}`;

/** Flattened solutionStyle — same shape as inspirationsGrid ref branch. */
const SOLUTION_STYLE_INSPIRATION_CARD = /* groq */ `{
  "kind": "ref",
  _id,
  _type,
  "title": coalesce(shortName, title),
  "description": shortDescription,
  "imageSrc": featuredImage.asset->url,
  "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText),
  "slug": slug.current,
  "solutionSlug": solution->slug.current,
  "_key": slug.current
}`;

/** Style docs with authored filter — for hero product membership queries. */
export const SOLUTION_STYLES_FILTER_QUERY = /* groq */ `*[
  _type == "solutionStyle" &&
  solution._ref == $solutionId &&
  !(_id in path("drafts.**"))
] | order(title asc) {
  _id,
  filter,
  excludedProducts[]{ _ref }
}`;

export type SolutionStyleFilterDoc = {
    _id: string;
    filter?: {
        productLines?: {_ref: string}[] | null;
        productStyles?: {_ref: string}[] | null;
        keywords?: string[] | null;
    } | null;
    excludedProducts?: {_ref: string}[] | null;
};

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
  solutionType,
  hasPage,
  "slug": slug.current,
  shortDescription,
  description,
  "descriptionText": pt::text(description),
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "packagingFormats": packagingFormats[]->${FORMAT_REF},
  "relatedProducts": relatedProducts[]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  },
  "relatedCaseStudies": relatedCaseStudies[]{
    _key,
    ...@->${RELATED_CASE_STUDY_CARD}
  },
  "relatedVideoCaseStudies": relatedCaseStudies[]{
    _key,
    ...@->${RELATED_VIDEO_CASE_STUDY_CARD}
  },
  "relatedSolutions": relatedSolutions[]->${RELATED_REF},
  "faqs": faqs[]->{
    question,
    "answerPlain": pt::text(answer)
  },
  "relatedSolutionStyles": *[
    _type == "solutionStyle" &&
    solution._ref == ^._id &&
    !(_id in path("drafts.**"))
  ] | order(title asc) ${SOLUTION_STYLE_INSPIRATION_CARD},
  "sections": sections[]${PAGE_SECTIONS_PROJECTION},
  "template": template->{
    _id,
    _type,
    "sections": sections[]${PAGE_SECTIONS_PROJECTION}
  },
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
  featuredImage{
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

import type {
    CatalogProductDoc,
} from './catalog';
import type {
    PageSectionCaseStudyItemDoc,
    PageSectionFaqDoc,
    PageSectionInspirationsCardDoc,
    PageSectionVideoCaseStudyCardDoc,
} from './sections';

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

export type SolutionTemplateDoc = {
    _id: string;
    _type: string;
    sections?: PageSectionDoc[] | null;
};

export type SolutionBySlugDoc = {
    _id: string;
    title: string;
    h1?: string | null;
    shortName?: string | null;
    solutionType?: string | null;
    hasPage?: boolean | null;
    slug: string | null;
    shortDescription?: string | null;
    description?: unknown[] | null;
    descriptionText?: string | null;
    featuredImage?: unknown | null;
    packagingFormats?: SolutionFormatRefDoc[] | null;
    relatedProducts?: CatalogProductDoc[] | null;
    relatedCaseStudies?: PageSectionCaseStudyItemDoc[] | null;
    relatedVideoCaseStudies?: PageSectionVideoCaseStudyCardDoc[] | null;
    relatedSolutions?: SolutionRelatedRefDoc[] | null;
    faqs?: PageSectionFaqDoc[] | null;
    relatedSolutionStyles?: PageSectionInspirationsCardDoc[] | null;
    sections?: PageSectionDoc[] | null;
    template?: SolutionTemplateDoc | null;
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
    featuredImage?: unknown | null;
};
