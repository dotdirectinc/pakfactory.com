import { defineField } from 'sanity'

/**
 * Per-use toggle for render-time logo watermark on detail body images (PROD-2206).
 * Default on; editors can disable per image. Use only on bodyImage / gallery — not heroes or cards.
 */
export function applyWatermarkField() {
  return defineField({
    name: 'applyWatermark',
    title: 'Show watermark',
    type: 'boolean',
    description:
      'Show the PakFactory logo watermark on this in-article image (default on). Studio / Media downloads stay unmarked.',
    initialValue: true,
  })
}
