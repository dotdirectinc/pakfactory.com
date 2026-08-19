import type { Rule } from 'sanity'

/**
 * The §2.6 field-level patterns as one importable set — required/read-only,
 * source-owned marking, curated-list maximums, warn-don't-block ranges, and
 * deprecation. Every area task reuses these so "source-owned" or "max 4" is
 * enforced the same way on every type instead of re-typed per schema.
 *
 * The uniqueness rules live next door and are not repeated here:
 *   - taxonomy titles, ignoring case and punctuation → `uniqueTaxonomyTitle`
 *     (`./taxonomy-rules`)
 *   - a slug unique across several types sharing a URL segment →
 *     `uniqueSlugAcross` (`./slug-rules`)
 *
 * Singletons that must not be creatable from "create new" are governed at config
 * level by `makeNewDocumentOptions` in `sanity.config.ts` (§3.2) — a document
 * option, not a field option, so it is not modelled here.
 */

/** Standard note appended to a source-owned field's description. */
export const SOURCE_OWNED_NOTE =
  'Managed by the product data source — read-only in the Studio. Edits here would be overwritten on the next sync.'

/**
 * Mark a field as source-owned (§2.6): `readOnly` in the Studio and carrying the
 * standard note so the editor knows why. Spread over a `defineField` object.
 *
 * @example
 *   defineField({
 *     name: 'sku',
 *     title: 'SKU',
 *     type: 'string',
 *     group: GROUPS.specs,
 *     ...sourceOwned('The stock-keeping unit for this product.'),
 *   })
 */
export function sourceOwned(description: string): {
  readOnly: true
  description: string
} {
  return {
    readOnly: true,
    description: `${description} ${SOURCE_OWNED_NOTE}`,
  }
}

/**
 * Retire a field (§4.3) with Sanity's own mechanism — renders it read-only with
 * a visible message, so existing data stays legible while nothing new is
 * written. Spread over the `defineField` object; keep the field itself until the
 * readers have migrated.
 *
 * @example  ...deprecateField('Replaced by `properties[]`. Remove after PROD-2287 ships.')
 */
export function deprecateField(reason: string): { deprecated: { reason: string } } {
  return { deprecated: { reason } }
}

/**
 * A curated list with a stated maximum, validated to it (§2.6) — "a number in a
 * description is a suggestion, not a rule". Entries are also required to be
 * unique, since a curated list repeating an item is always a mistake.
 *
 * @param max  the hard ceiling (e.g. 4 for "max 4 featured", 6 for "3–6 FAQs")
 * @param min  optional floor (e.g. 3 for "3–6 FAQs"); omit for "up to N"
 *
 * @example  validation: maxCurated(6, 3)   // 3–6, unique
 * @example  validation: maxCurated(4)      // up to 4, unique
 */
export function maxCurated(max: number, min?: number) {
  return (Rule: Rule) => {
    let rule = Rule.max(max).unique()
    if (typeof min === 'number') rule = rule.min(min)
    return rule
  }
}

/**
 * Warn, don't block, when a human should still be allowed to decide (§2.6).
 * A value outside `[min, max]` shows a warning but the document still saves —
 * "manufacturability is the sales conversation's job, and a hard reject loses an
 * enquiry a phone call could win". Empty values pass (use `.required()` for
 * presence).
 *
 * @example  validation: warnOutOfRange(10, 2000, 'mm')
 */
export function warnOutOfRange(min: number, max: number, unit = '') {
  const suffix = unit ? ` ${unit}` : ''
  return (Rule: Rule) =>
    Rule.custom((value: unknown) => {
      if (value === undefined || value === null) return true
      if (typeof value !== 'number') return true
      if (value < min || value > max) {
        return `Outside the usual ${min}–${max}${suffix} range. You can still save — double-check it's intended.`
      }
      return true
    }).warning()
}

/**
 * Reference `options` for a taxonomy picker (§4.2): editors pick from existing
 * terms but cannot mint new ones inline, so a stray "Food-Safe" can't slip into
 * a list past the uniqueness rule. Spread into a reference field's `options`.
 *
 * @example
 *   defineField({
 *     name: 'property',
 *     type: 'reference',
 *     to: [{ type: 'property' }],
 *     options: { ...taxonomyPickerOptions },
 *   })
 */
export const taxonomyPickerOptions = { disableNew: true } as const
