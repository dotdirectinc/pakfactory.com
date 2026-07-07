import { defineField } from 'sanity'

/**
 * Reusable top/bottom dashed dieline border toggles for full-bleed page-builder blocks.
 * Editors can hide a border when the adjacent block already shows one (avoids double-dash).
 */
export function dielineBorderFields() {
  return [
    defineField({
      name: 'showTopBorder',
      title: 'Show top dashed border',
      type: 'boolean',
      initialValue: true,
      description:
        'Hide when the block above already shows a dashed edge to avoid a double line.',
    }),
    defineField({
      name: 'showBottomBorder',
      title: 'Show bottom dashed border',
      type: 'boolean',
      initialValue: true,
      description:
        'Hide when the block below already shows a dashed edge to avoid a double line.',
    }),
  ]
}

/** Compact label for block list previews (e.g. "top off · bottom on"). */
export function dielineBorderPreviewSubtitle(
  showTopBorder?: boolean,
  showBottomBorder?: boolean,
): string | undefined {
  const top = showTopBorder === false ? 'top off' : showTopBorder === true ? 'top on' : undefined
  const bottom =
    showBottomBorder === false ? 'bottom off' : showBottomBorder === true ? 'bottom on' : undefined
  const parts = [top, bottom].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}
