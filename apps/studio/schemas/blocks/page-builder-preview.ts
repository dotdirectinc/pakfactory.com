/**
 * Grid preview thumbnails for the page-builder insert menu.
 * Files live in apps/studio/static/page-builder-thumbnails/{_type}.webp
 * Add the `_type` here when design ships a matching asset (otherwise Studio uses the block icon).
 */
export const PAGE_BUILDER_PREVIEW_TYPES = new Set<string>([
  // Empty → the insert-menu grid uses each section's default schema icon.
  // Re-add a `_type` here once a matching /static/page-builder-thumbnails/{_type}.webp ships.
])

export function pageBuilderPreviewUrl(
  schemaTypeName: string,
): string | undefined {
  if (!PAGE_BUILDER_PREVIEW_TYPES.has(schemaTypeName)) return undefined
  return `/static/page-builder-thumbnails/${schemaTypeName}.webp`
}
