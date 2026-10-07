/**
 * Solutions GROQ for www rebuild — LPs at `/solutions/[slug]` and
 * Solution Style catalogues at `/solutions/[slug]/[styleSlug]` (PROD-2520 FE).
 * Field names mirror `solution` / `solutionStyle` / `product` Studio schemas.
 */

import {KIND_INSPIRATION} from '../product-kind';
import type {SolutionStyleFilter} from '../solution-style-filter';
import {CATALOG_PRODUCT_CARD_FIELDS, CATALOG_PRODUCT_FIELDS, PRODUCT_LISTED, SOLUTION_ACTIVE, SOLUTION_STYLE_ACTIVE} from './catalog';
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
  "image": select(
    defined(cardImage.asset) => cardImage{
      ...,
      "alt": coalesce(^.cardImageAlt, alt, asset->altText, ^.title)
    },
    defined(heroMedia.videoThumbnail.asset) => heroMedia.videoThumbnail{
      ...,
      "alt": coalesce(alt, asset->altText, ^.title)
    }
  ),
  "imageAlt": coalesce(cardImageAlt, cardImage.asset->altText, title),
  "logoSrc": client->logo.asset->url,
  "logoAlt": client->name,
  "videoSrc": previewVideo.asset->url,
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
  "imageSrc": coalesce(
    images[primary == true][0].asset->url,
    images[0].asset->url,
    featuredImage.asset->url
  ),
  "imageAlt": coalesce(
    images[primary == true][0].alt,
    images[primary == true][0].asset->altText,
    images[0].alt,
    images[0].asset->altText,
    featuredImage.alt,
    featuredImage.asset->altText
  ),
  "slug": slug.current,
  "solutionSlug": solution->slug.current,
  "_key": slug.current
}`;

/** Style docs with authored filter — for hero product membership queries. */
export const SOLUTION_STYLES_FILTER_QUERY = /* groq */ `*[
  _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
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

/**
 * Industry LP hero tiles — product stills on `media` / `images`; lifestyle stills
 * via `lifestyleImages` from {@link CATALOG_MEDIA_ARRAYS} (www picks `[0]` for tiles).
 * Used by auto query and curated `featuredProducts` on the solution doc (PROD-2763).
 */
const SOLUTION_HERO_PRODUCT_PROJ = /* groq */ `{
  ${CATALOG_PRODUCT_FIELDS},
  "media": select(
    count(images) > 0 => images[]{
      ...,
      "alt": ${IMAGE_ALT}
    },
    [
      ...select(defined(featuredImage.asset) => [featuredImage{
        ...,
        "alt": ${IMAGE_ALT}
      }], []),
      ...coalesce(media, [])[]{
        ...,
        "alt": ${IMAGE_ALT}
      }
    ]
  ),
  lifestyleImages[]{
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

/** Solution landing page by slug (caller gates on status). */
export const SOLUTION_BY_SLUG_QUERY = /* groq */ `*[
  _type == "solution" &&
  slug.current == $slug
][0]{
  _id,
  title,
  h1,
  shortName,
  solutionType,
  status,
  "slug": slug.current,
  shortDescription,
  description,
  "descriptionText": pt::text(description),
  "featuredImage": coalesce(
    images[primary == true][0],
    images[0],
    featuredImage
  ){
    ...,
    "alt": ${IMAGE_ALT}
  },
  images[]{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "packagingFormats": packagingFormats[]->${FORMAT_REF},
  "relatedProducts": relatedProducts[@->{"ok": ${PRODUCT_LISTED}}.ok == true]->{
    ${CATALOG_PRODUCT_CARD_FIELDS}
  },
  "featuredProducts": featuredProducts[@->{"ok": ${PRODUCT_LISTED}}.ok == true]->${SOLUTION_HERO_PRODUCT_PROJ},
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
    answer,
    "answerPlain": pt::text(answer)
  },
  // Curated order first, then the rest alphabetically — see SOLUTION_STYLES note.
  "relatedSolutionStyles": (
    coalesce(
      (styleOrder[]->)[defined(_id) && ${SOLUTION_STYLE_ACTIVE} && !(_id in path("drafts.**"))]${SOLUTION_STYLE_INSPIRATION_CARD},
      []
    )
    + *[
      _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
      solution._ref == ^._id &&
      !(_id in path("drafts.**")) &&
      !(_id in coalesce(^.styleOrder, [])[]._ref)
    ] | order(title asc) ${SOLUTION_STYLE_INSPIRATION_CARD}
  ),
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
 * Active inspiration products tagged to a solution and belonging to a product
 * line. Used for `/solutions/[slug]/[lineSlug]`.
 * Kind gate: {@link KIND_INSPIRATION} (solution surfaces are inspiration-only).
 */
export const SOLUTION_LINE_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${KIND_INSPIRATION} &&
  ${PRODUCT_LISTED} &&
  $solutionSlug in solutions[]->slug.current &&
  coalesce(productLine, basedOn->productLine)->slug.current == $lineSlug
] | order(title asc) {
  ${CATALOG_PRODUCT_CARD_FIELDS}
}`;

/**
 * Active inspiration products tagged to a solution (LP related-products fallback).
 * Caps at 12; curated `relatedProducts` on the solution doc takes precedence.
 * Kind gate: {@link KIND_INSPIRATION}.
 */
export const SOLUTION_TAGGED_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${KIND_INSPIRATION} &&
  ${PRODUCT_LISTED} &&
  $solutionSlug in solutions[]->slug.current
] | order(title asc) [0...12] {
  ${CATALOG_PRODUCT_CARD_FIELDS}
}`;

/**
 * Industry LP hero tiles — inspiration products whose Solutions categorization
 * includes this solution. Full catalog fields for preview customizations; cap 16.
 * Media prefers `featuredImage` (card/representative) then gallery `media`.
 * Kind gate: {@link KIND_INSPIRATION}.
 */
export const SOLUTION_HERO_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  ${KIND_INSPIRATION} &&
  ${PRODUCT_LISTED} &&
  $solutionSlug in solutions[]->slug.current
] | order(title asc) [0...16] ${SOLUTION_HERO_PRODUCT_PROJ}`;

/** Slugs + formats for solutions that earn a landing page (static params). */
export const SOLUTION_PAGE_SLUGS_QUERY = /* groq */ `*[
  _type == "solution" &&
  ${SOLUTION_ACTIVE} &&
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
  ${SOLUTION_ACTIVE} &&
  defined(slug.current)
] | order(title asc) {
  title,
  h1,
  shortName,
  shortDescription,
  "slug": slug.current,
  "featuredImage": coalesce(
    images[primary == true][0],
    images[0],
    featuredImage
  ){
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
    status?: string | null;
    slug: string | null;
    shortDescription?: string | null;
    description?: unknown[] | null;
    descriptionText?: string | null;
    featuredImage?: unknown | null;
    packagingFormats?: SolutionFormatRefDoc[] | null;
    relatedProducts?: CatalogProductDoc[] | null;
    featuredProducts?: CatalogProductDoc[] | null;
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

const SOLUTION_STYLE_FILTER_FIELDS = /* groq */ `
  filter{
    productLines[]{_ref},
    productStyles[]{_ref},
    keywords
  },
  excludedProducts[]{_ref}
`;

/**
 * Solution Style by parent + style slug. Parent must be Active (PROD-2520; status since PROD-2845).
 * Filter refs feed `@pakfactory/sanity/solution-style-filter` on the FE.
 */
export const SOLUTION_STYLE_BY_SLUGS_QUERY = /* groq */ `*[
  _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
  slug.current == $styleSlug &&
  solution->slug.current == $solutionSlug &&
  solution->status == "active"
][0]{
  _id,
  title,
  h1,
  shortName,
  "slug": slug.current,
  shortDescription,
  description,
  "descriptionText": pt::text(description),
  "featuredImage": coalesce(
    images[primary == true][0],
    images[0],
    featuredImage
  ){
    ...,
    "alt": ${IMAGE_ALT}
  },
  ${SOLUTION_STYLE_FILTER_FIELDS},
  "solution": solution->{
    _id,
    title,
    shortName,
    status,
    "slug": slug.current,
    allowIndex,
    allowFollow
  },
  metaTitle,
  metaDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonicalUrl
}`;

/** One style card in the collection band under a solution. */
const SOLUTION_STYLE_CARD = /* groq */ `{
  _id,
  title,
  h1,
  shortName,
  "slug": slug.current,
  shortDescription,
  "featuredImage": coalesce(
    images[primary == true][0],
    images[0],
    featuredImage
  ){
    ...,
    "alt": ${IMAGE_ALT}
  }
}`;

/**
 * Style cards under an Active parent (collection band on the solution LP), in
 * MERCHANDISED order (PROD-2742).
 *
 * Two tiers: the styles named in the solution's `styleOrder`, in the order they
 * were dragged, then every other style alphabetically. `styleOrder` is order only
 * and NEVER a gate — an unlisted style still renders, it just lands in the tail.
 *
 * 🔴 BOTH `coalesce(..., [])` calls are load-bearing. `styleOrder` is unset on
 * every solution until someone drags something, and in GROQ `null + array` is null
 * while `_id in null[]._ref` matches nothing — so dropping the first returns
 * undefined and dropping the second returns [], either of which empties the band
 * site-wide with no error. Pinned by solution-style-order.test.ts.
 *
 * The parent is not in scope as `^` here (this query takes a slug, not a document),
 * so `styleOrder` is read through a sub-query on the solution. The twin inside
 * SOLUTION_LANDING uses `^.styleOrder` directly.
 *
 * References in `styleOrder` are WEAK, so a deleted style dereferences to null;
 * `defined(_id)` drops it before projection.
 */
export const SOLUTION_STYLES_FOR_SOLUTION_QUERY = /* groq */ `*[
  _type == "solution" &&
  slug.current == $solutionSlug &&
  ${SOLUTION_ACTIVE}
][0]{
  "styles": (
    coalesce(
      (styleOrder[]->)[defined(_id) && ${SOLUTION_STYLE_ACTIVE} && defined(slug.current)]${SOLUTION_STYLE_CARD},
      []
    )
    + *[
      _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
      defined(slug.current) &&
      solution._ref == ^._id &&
      !(_id in coalesce(^.styleOrder, [])[]._ref)
    ] | order(title asc) ${SOLUTION_STYLE_CARD}
  )
}.styles`;

/**
 * Styles under an Active solution (merchandised order) **with** filter fields —
 * used to resolve the inspiration PDP breadcrumb Solution Style (PROD-2763).
 * Same order as {@link SOLUTION_STYLES_FOR_SOLUTION_QUERY}; cards alone lack filters.
 */
const SOLUTION_STYLE_BREADCRUMB_PROJ = /* groq */ `{
  _id,
  title,
  shortName,
  "slug": slug.current,
  ${SOLUTION_STYLE_FILTER_FIELDS}
}`;

export const SOLUTION_STYLES_FOR_BREADCRUMB_QUERY = /* groq */ `*[
  _type == "solution" &&
  slug.current == $solutionSlug &&
  ${SOLUTION_ACTIVE}
][0]{
  _id,
  "styles": (
    coalesce(
      (styleOrder[]->)[defined(_id) && ${SOLUTION_STYLE_ACTIVE} && defined(slug.current)]${SOLUTION_STYLE_BREADCRUMB_PROJ},
      []
    )
    + *[
      _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
      defined(slug.current) &&
      solution._ref == ^._id &&
      !(_id in coalesce(^.styleOrder, [])[]._ref)
    ] | order(title asc) ${SOLUTION_STYLE_BREADCRUMB_PROJ}
  )
}`;

/** Static params for `/solutions/[slug]/[styleSlug]`. */
export const SOLUTION_STYLE_PAGE_PARAMS_QUERY = /* groq */ `*[
  _type == "solutionStyle" &&
  ${SOLUTION_STYLE_ACTIVE} &&
  defined(slug.current) &&
  defined(solution->slug.current) &&
  solution->status == "active"
]{
  "solutionSlug": solution->slug.current,
  "styleSlug": slug.current
}`;

export type SolutionStyleParentDoc = {
    _id: string;
    title: string;
    shortName?: string | null;
    status?: string | null;
    slug: string | null;
    allowIndex?: boolean | null;
    allowFollow?: boolean | null;
};

export type SolutionStyleRefDoc = {
    _ref: string;
};

export type SolutionStyleBySlugsDoc = {
    _id: string;
    title: string;
    h1?: string | null;
    shortName?: string | null;
    slug: string | null;
    shortDescription?: string | null;
    description?: unknown[] | null;
    descriptionText?: string | null;
    featuredImage?: unknown | null;
    filter?: SolutionStyleFilter | null;
    excludedProducts?: SolutionStyleRefDoc[] | null;
    solution: SolutionStyleParentDoc | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    allowIndex?: boolean | null;
    allowFollow?: boolean | null;
    noImageIndex?: boolean | null;
    canonicalUrl?: string | null;
};

export type SolutionStyleCardDoc = {
    _id: string;
    title: string;
    h1?: string | null;
    shortName?: string | null;
    slug: string | null;
    shortDescription?: string | null;
    featuredImage?: unknown | null;
};

/** Styles + filters for inspiration PDP breadcrumb resolution (PROD-2763). */
export type SolutionStyleBreadcrumbDoc = {
    _id: string;
    title: string;
    shortName?: string | null;
    slug: string | null;
    filter?: SolutionStyleFilter | null;
    excludedProducts?: SolutionStyleRefDoc[] | null;
};

export type SolutionStylesForBreadcrumbDoc = {
    _id: string;
    styles?: SolutionStyleBreadcrumbDoc[] | null;
};

export type SolutionStylePageParamDoc = {
    solutionSlug: string | null;
    styleSlug: string | null;
};
