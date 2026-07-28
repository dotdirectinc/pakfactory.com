import { defineField } from 'sanity'
import { DefaultOnBooleanInput } from '../components/DefaultOnBooleanInput'

/**
 * Per-use toggle for render-time logo watermark on detail body images (PROD-2206).
 * Default on; editors can disable per image. Use only on bodyImage / gallery — not heroes or cards.
 *
 * Existing blocks often lack the stored key — {@link DefaultOnBooleanInput} shows ON
 * for unset values so Studio matches front-end `coalesce(applyWatermark, true)`.
 */
export function applyWatermarkField() {
  return defineField({
    name: 'applyWatermark',
    title: 'Show watermark',
    type: 'boolean',
    description:
      'Show the PakFactory logo watermark on this in-article image (default on). Studio / Media downloads stay unmarked.',
    initialValue: true,
    components: { input: DefaultOnBooleanInput },
  })
}
