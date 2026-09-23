/**
 * Expertise GROQ for www — landing grid at `/expertise` and stage shells at
 * `/expertise/[slug]`. Display order lives on `expertisePage.featured`
 * (ADR-017); do not revive `expertiseStage.order`.
 *
 * Eric’s canonical pin order for humans filling `featured`:
 * Design → Prototyping → Managed Manufacturing → Strategy → Logistics → Fulfillment.
 */

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

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

/** Stage detail shell by slug. */
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
  diagram{
    ...,
    "alt": ${IMAGE_ALT}
  },
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
  diagram?: unknown | null;
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
