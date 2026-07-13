/**
 * Case Studies GROQ — field names mirror the `caseStudy` schema (PROD-1893).
 *
 * Canonical URL: pakfactory.com/case-studies/{slug}
 * Sanity's published perspective (www client) gates on document publish state.
 */

// ─── Shared sub-projections ───────────────────────────────────────────────────

const TAXONOMY_ITEM = /* groq */ `{ _id, title, "slug": slug.current }`;

const SOLUTION_TAXONOMY_ITEM = /* groq */ `{
  _id,
  "title": coalesce(headline, internalTitle),
  "slug": slug.current,
  solutionType
}`;

const CLIENT_INDUSTRY_ITEM = /* groq */ `industry->${SOLUTION_TAXONOMY_ITEM}`;

// ─── Field projections ────────────────────────────────────────────────────────

const CASE_STUDY_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  "dateModified": coalesce(lastModified, publishedAt),
  cardSummary,
  "cardImageUrl": cardImage.asset->url,
  cardImageAlt,
  "client": client->{ name, "logoUrl": logo.asset->url, ${CLIENT_INDUSTRY_ITEM} },
  "products": products[]->${TAXONOMY_ITEM},
  "expertiseAreas": expertiseAreas[]->${TAXONOMY_ITEM},
  "heroMediaType": heroMedia.mediaType
}`;

const CASE_STUDY_DETAIL_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  "dateModified": coalesce(lastModified, publishedAt),
  cardSummary,
  "cardImageUrl": cardImage.asset->url,
  cardImageAlt,
  "client": client->{ name, "slug": slug.current, "logoUrl": logo.asset->url, website, ${CLIENT_INDUSTRY_ITEM} },
  heroIntro,
  heroMedia {
    mediaType,
    "imageUrl": image.asset->url,
    "imageHotspot": image.hotspot,
    "imageCrop": image.crop,
    alt,
    videoUrl,
    "videoThumbnailUrl": videoThumbnail.asset->url,
    "videoThumbnailHotspot": videoThumbnail.hotspot
  },
  "products": products[]->${TAXONOMY_ITEM},
  "expertiseAreas": expertiseAreas[]->${TAXONOMY_ITEM},
  "capabilities": capabilities[]->${TAXONOMY_ITEM},
  "highlights": highlights[]{ _key, title, description },
  challenge,
  solution,
  result,
  "relatedStudies": select(
    count(relatedStudies) > 0 => relatedStudies[0...6]->${CASE_STUDY_CARD_FIELDS},
    *[_type == "caseStudy" && _id != ^._id] | order(publishedAt desc)[0...6]${CASE_STUDY_CARD_FIELDS}
  ),
  metaTitle,
  metaDescription,
  canonicalUrl,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url
}`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** All published case studies for the listing page — ordered newest first. */
export const CASE_STUDIES_LISTING_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
] | order(publishedAt desc) ${CASE_STUDY_CARD_FIELDS}`;

/** Single case study by slug for the detail page. */
export const CASE_STUDY_BY_SLUG_QUERY = /* groq */ `*[
  _type == "caseStudy" && slug.current == $slug
][0] ${CASE_STUDY_DETAIL_FIELDS}`;

/** All slugs for generateStaticParams. */
export const CASE_STUDY_PATHS_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
]{ "slug": slug.current }`;

/** Slugs + last-modified for sitemap generation — published only. */
export const CASE_STUDY_SITEMAP_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
] | order(publishedAt desc) {
  "slug": slug.current,
  "lastmod": coalesce(lastModified, publishedAt, _updatedAt)
}`;

/** Singleton `caseStudiesPage` document — hero copy, CTA config, SEO. */
export const CASE_STUDIES_PAGE_QUERY = /* groq */ `*[_type == "caseStudiesPage"][0] {
  heroEyebrow,
  heroHeading,
  heroIntro,
  detailCta { heading, primaryLabel, primaryHref, secondaryLabel, secondaryHref },
  relatedSectionHeading,
  relatedSectionIntro,
  metaTitle,
  metaDescription,
  "ogImageUrl": ogImage.asset->url
}`;

/** All taxonomy options for the listing page filter UI — single round-trip. */
export const CASE_STUDY_FILTER_OPTIONS_QUERY = /* groq */ `{
  "solutions": *[_type == "solution" && solutionType == "industry" && defined(slug.current)] | order(coalesce(headline, internalTitle) asc) ${SOLUTION_TAXONOMY_ITEM},
  "products": *[_type == "productCategory"] | order(title asc) ${TAXONOMY_ITEM},
  "expertiseAreas": *[_type == "expertiseStage" && status != "deprecated"] | order(order asc) ${TAXONOMY_ITEM}
}`;

// ─── TypeScript types (mirrors GROQ projections above) ───────────────────────

export type CaseStudyTaxonomyItem = {
  _id: string;
  title: string;
  slug: string;
  solutionType?: string;
};

export type CaseStudyHighlight = {
  _key: string;
  title: string;
  description: string | null;
};

export type CaseStudyClientIndustry = CaseStudyTaxonomyItem | null;

export type CaseStudyClientCard = {
  name: string;
  logoUrl: string | null;
  industry?: CaseStudyClientIndustry;
};

export type CaseStudyClientDetail = CaseStudyClientCard & {
  slug: string | null;
  website: string | null;
};

export type CaseStudyHeroMedia = {
  mediaType: 'image' | 'video';
  imageUrl: string | null;
  imageHotspot: { x: number; y: number } | null;
  imageCrop: object | null;
  alt: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  videoThumbnailHotspot: { x: number; y: number } | null;
};

export type CaseStudyCard = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  dateModified: string | null;
  cardSummary: string | null;
  cardImageUrl: string | null;
  cardImageAlt: string | null;
  client: CaseStudyClientCard | null;
  products: CaseStudyTaxonomyItem[] | null;
  expertiseAreas: CaseStudyTaxonomyItem[] | null;
  heroMediaType: 'image' | 'video' | null;
};

export type CaseStudyDetail = CaseStudyCard & {
  client: CaseStudyClientDetail | null;
  heroIntro: unknown; // Portable Text (restricted: bold + clientLink)
  heroMedia: CaseStudyHeroMedia | null;
  capabilities: CaseStudyTaxonomyItem[] | null;
  highlights: CaseStudyHighlight[] | null;
  challenge: unknown; // Portable Text
  solution: unknown; // Portable Text
  result: unknown; // Portable Text
  relatedStudies: CaseStudyCard[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  allowIndex: boolean | null;
  allowFollow: boolean | null;
  noImageIndex: boolean | null;
  ogImageUrl: string | null;
};

export type CaseStudyPath = { slug: string };

export type CaseStudySitemapEntry = { slug: string; lastmod: string | null };

export type CaseStudyFilterOptions = {
  solutions: CaseStudyTaxonomyItem[];
  products: CaseStudyTaxonomyItem[];
  expertiseAreas: CaseStudyTaxonomyItem[];
};

export type CaseStudiesPageData = {
  heroEyebrow: string | null;
  heroHeading: string | null;
  heroIntro: unknown;
  detailCta: {
    heading: string | null;
    primaryLabel: string | null;
    primaryHref: string | null;
    secondaryLabel: string | null;
    secondaryHref: string | null;
  } | null;
  relatedSectionHeading: string | null;
  relatedSectionIntro: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
};
