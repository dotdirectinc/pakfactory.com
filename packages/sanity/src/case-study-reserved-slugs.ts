/**
 * Slugs that must never be used for caseStudy documents — they collide with
 * App Router static segments under /case-studies/*.
 * Wire into the caseStudy Sanity schema slug validation (PROD-1650).
 */
export const CASE_STUDY_RESERVED_SLUGS = [
  "api",
  "page",
  "sitemap.xml",
] as const;

export type CaseStudyReservedSlug = (typeof CASE_STUDY_RESERVED_SLUGS)[number];

export function isBlockedCaseStudySlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return (CASE_STUDY_RESERVED_SLUGS as readonly string[]).includes(slug);
}
