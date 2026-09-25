/**
 * Expertise GROQ for www — landing grid at `/expertise` and stage detail pages at
 * `/expertise/[slug]` (PROD-2577). Display order lives on `expertisePage.featured`
 * (ADR-017); do not revive `expertiseStage.order`.
 *
 * Eric’s canonical pin order for humans filling `featured`:
 * Design → Prototyping → Managed Manufacturing → Strategy → Logistics → Fulfillment.
 */

import {
  EXPERTISE_SERVICE_DIMENSION,
  PAGE_SECTIONS_PROJECTION,
  type ExpertiseServiceDimensionDoc,
  type PageSectionCaseStudyItemDoc,
  type PageSectionDoc,
  type PageSectionFaqDoc,
} from './sections';

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

/** Case-study card — same shape as `caseStudiesRow.items` (inherit target). */
const STAGE_CASE_STUDY_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "cardImageUrl": cardImage.asset->url,
  "cardImageAlt": coalesce(cardImageAlt, cardImage.asset->altText),
  "clientName": client->name,
  "tag": coalesce(products[0]->title, expertise[0]->title, expertiseAreas[0]->title)
}`;

/** Card fields shared by listing + featured projections. */
const EXPERTISE_STAGE_CARD_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  description,
  status,
  diagram{
    ...,
    "alt": ${IMAGE_ALT}
  }
`;

/** Non-discontinued stages (natural title order; featured merge happens in app). */
export const EXPERTISE_STAGES_QUERY = /* groq */ `*[
  _type == "expertiseStage" &&
  defined(slug.current) &&
  status != "discontinued"
] | order(title asc) {
  ${EXPERTISE_STAGE_CARD_FIELDS}
}`;

/**
 * Ordered featured stages from the Expertise listing singleton.
 * Missing document → null; empty featured → [].
 */
export const EXPERTISE_PAGE_FEATURED_QUERY = /* groq */ `*[_id == "expertisePage"][0]{
  "featured": featured[
    @->_type == "expertiseStage" &&
    defined(@->slug.current) &&
    @->status != "discontinued"
  ]->{
    ${EXPERTISE_STAGE_CARD_FIELDS}
  }
}`;

/** Slugs for generateStaticParams (non-discontinued). */
export const EXPERTISE_STAGE_SLUGS_QUERY = /* groq */ `*[
  _type == "expertiseStage" &&
  defined(slug.current) &&
  status != "discontinued"
] | order(title asc) {
  "slug": slug.current
}`;

/**
 * Stage detail page by slug — route-owned hero fields, body `sections[]`, and
 * the host lists sections inherit from (ADR-020 §8): `services` →
 * `signatureSystem`, `faqs` → `faqSection`, featured (else tagged) case
 * studies → `caseStudiesRow`.
 *
 * Body = the selected Expertise Page template's `sections` (Main Website →
 * Expertise Pages). Falls back to the stage's legacy `sections` until
 * `migrate-expertise-stage-template` has moved them onto a template.
 *
 * Case-study readers accept both `expertise` and `expertiseAreas` — PROD-2293
 * (#365) renames caseStudy.expertiseAreas → expertise.
 */
export const EXPERTISE_STAGE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "expertiseStage" &&
  slug.current == $slug &&
  status != "discontinued"
][0]{
  _id,
  title,
  h1,
  "slug": slug.current,
  tagline,
  description,
  status,
  heroCtaLabel,
  diagram{
    ...,
    "alt": ${IMAGE_ALT}
  },
  "services": services[@->status != "discontinued"]->${EXPERTISE_SERVICE_DIMENSION},
  "faqs": faqs[]->{
    question,
    "answerPlain": pt::text(answer)
  },
  "featuredStudies": featuredStudies[]{
    _key,
    ...@->${STAGE_CASE_STUDY_CARD}
  },
  "taggedStudies": *[
    _type == "caseStudy" &&
    (^._id in expertise[]._ref || ^._id in expertiseAreas[]._ref) &&
    !(_id in path("drafts.**"))
  ] | order(_updatedAt desc)[0...6]{
    "_key": _id,
    ...${STAGE_CASE_STUDY_CARD}
  },
  "templateTitle": template->title,
  "sections": coalesce(template->sections, sections)[]${PAGE_SECTIONS_PROJECTION},
  ogTitle,
  ogDescription,
  "ogImageUrl": ogImage.asset->url,
  metaTitle,
  metaDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonicalUrl
}`;

export type ExpertiseStageCardDoc = {
  _id: string;
  title: string;
  slug: string | null;
  description?: string | null;
  status?: string | null;
  diagram?: unknown | null;
};

export type ExpertisePageFeaturedDoc = {
  featured?: ExpertiseStageCardDoc[] | null;
} | null;

export type ExpertiseStageSlugDoc = {
  slug: string | null;
};

export type ExpertiseStageBySlugDoc = {
  _id: string;
  title: string;
  h1?: string | null;
  slug: string | null;
  tagline?: string | null;
  description?: string | null;
  status?: string | null;
  heroCtaLabel?: string | null;
  diagram?: unknown | null;
  services?: ExpertiseServiceDimensionDoc[] | null;
  faqs?: PageSectionFaqDoc[] | null;
  featuredStudies?: PageSectionCaseStudyItemDoc[] | null;
  /** Case studies tagging this stage — fallback when `featuredStudies` is empty. */
  taggedStudies?: PageSectionCaseStudyItemDoc[] | null;
  /** Title of the Expertise Page template the body comes from (null = legacy/none). */
  templateTitle?: string | null;
  sections?: PageSectionDoc[] | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  allowIndex?: boolean | null;
  allowFollow?: boolean | null;
  noImageIndex?: boolean | null;
  canonicalUrl?: string | null;
};

/**
 * Featured stages first (array order), then remaining stages by title.
 * Tolerates a missing/empty featured list.
 */
export function orderExpertiseStages<T extends {_id: string; title: string}>(
  featured: T[] | null | undefined,
  all: T[],
): T[] {
  const pinned = (featured ?? []).filter((stage) =>
    all.some((item) => item._id === stage._id),
  );
  const pinnedIds = new Set(pinned.map((stage) => stage._id));
  const remainder = all
    .filter((stage) => !pinnedIds.has(stage._id))
    .sort((a, b) => a.title.localeCompare(b.title));
  return [...pinned, ...remainder];
}
