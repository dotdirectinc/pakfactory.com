/**
 * Grid preview thumbnails for the www sections insert menu (ADR-020 §10).
 * Files live in apps/studio/static/section-thumbnails/{_type}.webp
 * Add the `_type` here when a matching asset ships (otherwise Studio uses the
 * section's default schema icon).
 */
export const SECTION_PREVIEW_TYPES = new Set<string>([
  'logoWall',
  'inspirationsGrid',
  'mediaFeature',
  'expertiseSequence',
  'caseStudiesRow',
  'videoCaseStudiesRow',
  'faqSection',
  'quoteCta',
  'solutionsRow',
])

export function sectionPreviewUrl(
  schemaTypeName: string,
): string | undefined {
  if (!SECTION_PREVIEW_TYPES.has(schemaTypeName)) return undefined
  return `/static/section-thumbnails/${schemaTypeName}.webp`
}
