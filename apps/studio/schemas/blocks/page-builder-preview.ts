import { createElement } from 'react'

/**
 * Grid preview thumbnails for the page-builder insert menu.
 * Files live in apps/studio/static/page-builder-thumbnails/{_type}.webp
 * Add the `_type` here when design ships a matching asset (otherwise Studio uses the block icon).
 */
export const PAGE_BUILDER_PREVIEW_TYPES = new Set<string>([
  'postFeaturedRow',
  'postCategoryRow',
  'postSpotlightRow',
  'tagStrip',
  'ctaNewsletter',
  'ctaRfq',
  'ctaPillars',
  'richTextBand',
])

export function pageBuilderPreviewUrl(
  schemaTypeName: string,
): string | undefined {
  if (!PAGE_BUILDER_PREVIEW_TYPES.has(schemaTypeName)) return undefined
  return `/static/page-builder-thumbnails/${schemaTypeName}.webp`
}

/**
 * Square mini-icon (purpose-built for the ~35px array-row preview slot) for a
 * block `_type`. Use as the `media` in a block's `preview.prepare()` so the
 * assembled page-builder list shows a recognizable glyph per block.
 * Files live in apps/studio/static/page-builder-icons/{_type}.webp.
 */
export function blockRowIcon(schemaTypeName: string) {
  return function BlockRowIcon() {
    return createElement('img', {
      src: `/static/page-builder-icons/${schemaTypeName}.webp`,
      alt: '',
      style: { width: '100%', height: '100%', objectFit: 'cover' },
    })
  }
}
