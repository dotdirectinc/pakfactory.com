/**
 * Case Studies GROQ — field names mirror the `caseStudy` schema (PROD-1893).
 *
 * Canonical URL: pakfactory.com/case-studies/{slug}
 */

// ─── Shared sub-projections ───────────────────────────────────────────────────

const TAXONOMY_ITEM = /* groq */ `{ _id, title, "slug": slug.current }`;

// ─── Field projections ────────────────────────────────────────────────────────

const CASE_STUDY_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  clientName,
  "clientLogoUrl": clientLogo.asset->url,
  "solutions": solutions[]->${TAXONOMY_ITEM},
  "packagingTypes": packagingTypes[]->${TAXONOMY_ITEM},
  "expertise": expertise[]->${TAXONOMY_ITEM},
  "heroImageUrl": heroImage.asset->url,
  "heroImageAlt": coalesce(heroImage.alt, heroImage.asset->altText, clientName)
}`;

const CASE_STUDY_DETAIL_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  clientName,
  "clientLogoUrl": clientLogo.asset->url,
  featuredVideo,
  "solutions": solutions[]->${TAXONOMY_ITEM},
  "packagingTypes": packagingTypes[]->${TAXONOMY_ITEM},
  "expertise": expertise[]->${TAXONOMY_ITEM},
  "metrics": metrics[]{ _key, title, description },
  "challenges": challenges{ intro, items },
  solutionsBody,
  resultBody,
  "resultImages": resultImages[]{ _key, "url": image.asset->url, alt, caption },
  "heroImageUrl": heroImage.asset->url,
  "heroImageAlt": coalesce(heroImage.alt, heroImage.asset->altText, clientName),
  metaTitle,
  metaDescription,
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

/** 3 most recently modified case studies, excluding the given slug. */
export const CASE_STUDY_RELATED_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current) && slug.current != $currentSlug
] | order(_updatedAt desc)[0...3] ${CASE_STUDY_CARD_FIELDS}`;

/** All slugs for generateStaticParams. */
export const CASE_STUDY_PATHS_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
]{ "slug": slug.current }`;

/** Slugs + last-modified for sitemap generation. */
export const CASE_STUDY_SITEMAP_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
] | order(publishedAt desc) {
  "slug": slug.current,
  "lastmod": coalesce(publishedAt, _updatedAt)
}`;

/** All taxonomy options for the listing page filter UI — single round-trip. */
export const CASE_STUDY_FILTER_OPTIONS_QUERY = /* groq */ `{
  "solutions": *[_type == "solution"] | order(title asc) ${TAXONOMY_ITEM},
  "packagingTypes": *[_type == "productCategory"] | order(title asc) ${TAXONOMY_ITEM},
  "expertise": *[_type == "expertiseStage"] | order(title asc) ${TAXONOMY_ITEM}
}`;

// ─── TypeScript types (mirrors GROQ projections above) ───────────────────────

export type CaseStudyTaxonomyItem = {
  _id: string;
  title: string;
  slug: string;
};

export type CaseStudyMetric = {
  _key: string;
  title: string;
  description: string | null;
};

export type CaseStudyChallenges = {
  intro: string | null;
  items: string[] | null;
};

export type CaseStudyResultImage = {
  _key: string;
  url: string | null;
  alt: string | null;
  caption: string | null;
};

export type CaseStudyCard = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  excerpt: string | null;
  clientName: string | null;
  clientLogoUrl: string | null;
  solutions: CaseStudyTaxonomyItem[] | null;
  packagingTypes: CaseStudyTaxonomyItem[] | null;
  expertise: CaseStudyTaxonomyItem[] | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
};

export type CaseStudyDetail = CaseStudyCard & {
  featuredVideo: string | null;
  metrics: CaseStudyMetric[] | null;
  challenges: CaseStudyChallenges | null;
  solutionsBody: unknown; // Portable Text
  resultBody: unknown; // Portable Text
  resultImages: CaseStudyResultImage[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
};

export type CaseStudyPath = { slug: string };

export type CaseStudySitemapEntry = { slug: string; lastmod: string | null };

export type CaseStudyFilterOptions = {
  solutions: CaseStudyTaxonomyItem[];
  packagingTypes: CaseStudyTaxonomyItem[];
  expertise: CaseStudyTaxonomyItem[];
};
