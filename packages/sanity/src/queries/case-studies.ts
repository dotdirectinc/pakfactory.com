/**
 * Case Studies GROQ — field names mirror the `caseStudy` schema defined in PROD-1650.
 * Coordinate with Eric before deploying the Studio schema to confirm field names match.
 *
 * Canonical URL: pakfactory.com/case-studies/{slug}
 */

// ─── Field projections ────────────────────────────────────────────────────────

const CASE_STUDY_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  clientName,
  industry,
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
  industry,
  "heroImageUrl": heroImage.asset->url,
  "heroImageAlt": coalesce(heroImage.alt, heroImage.asset->altText, clientName),
  body,
  "results": results[]{
    _key,
    metric,
    value,
    description
  },
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

/** All slugs for generateStaticParams. */
export const CASE_STUDY_PATHS_QUERY = /* groq */ `*[
  _type == "caseStudy" && defined(slug.current)
]{ "slug": slug.current }`;

// ─── TypeScript types (mirrors GROQ projections above) ───────────────────────

export type CaseStudyCard = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  excerpt: string | null;
  clientName: string | null;
  industry: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
};

export type CaseStudyResult = {
  _key: string;
  metric: string;
  value: string;
  description: string | null;
};

export type CaseStudyDetail = CaseStudyCard & {
  body: unknown; // Portable Text — typed further when PT renderer is wired up
  results: CaseStudyResult[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
};

export type CaseStudyPath = { slug: string };
