import { defineField } from 'sanity'
import type { Rule } from 'sanity'

/**
 * The row-section field set — Foundations (PROD-2286).
 *
 * A "row" is a section that shows a strip of other documents: a rail of posts, a
 * shelf of products, a set of related solutions. Every row shares the same five
 * fields, so they are defined once here and imported by each row section rather
 * than re-typed — the blog's four post rows are the pattern this generalises.
 *
 * The behaviour the fields encode: **curated override with a derive fallback.**
 * Leave the curated list empty and the row fills itself from `source`, newest or
 * highest-ranked first, up to `count`. Fill the curated list and those exact
 * items show, in that order — `source` and `count` are then ignored. An editor
 * gets a good row for free and an exact row when they want one, from one section.
 */

type RowSectionFieldsOptions = {
  /** Field group/tab id these fields belong to (usually the row object has none). */
  group?: string
  /**
   * Types the `source` reference may point at — what the row derives from
   * (a taxonomy term, a listing page). Omit to leave the row curation-only.
   */
  sourceTo?: { type: string }[]
  /** Types the curated override array holds — the documents shown in the row. */
  curatedTo: { type: string }[]
  /** Default derive count for a new row. Defaults to 3. */
  defaultCount?: number
  /** Label for the curated override list. Defaults to "Curated items". */
  curatedTitle?: string
  /** Noun for the derived items in descriptions, e.g. "posts", "products". */
  itemNoun?: string
}

/**
 * The five shared row fields: heading, intro, source, count, curated override.
 * Spread into a row section's `fields`.
 *
 * @example
 *   defineType({
 *     name: 'productShelfRow',
 *     type: 'object',
 *     fields: [
 *       ...rowSectionFields({
 *         sourceTo: [{ type: 'productLine' }],
 *         curatedTo: [{ type: 'product' }],
 *         itemNoun: 'products',
 *       }),
 *     ],
 *   })
 */
export function rowSectionFields({
  group,
  sourceTo,
  curatedTo,
  defaultCount = 3,
  curatedTitle = 'Curated items',
  itemNoun = 'items',
}: RowSectionFieldsOptions) {
  const withGroup = <T extends Record<string, unknown>>(field: T): T =>
    group ? { ...field, group } : field

  return [
    defineField(
      withGroup({
        name: 'heading',
        title: 'Heading',
        type: 'string',
        description: `The row's title, shown above the ${itemNoun}.`,
      }),
    ),
    defineField(
      withGroup({
        name: 'intro',
        title: 'Intro',
        type: 'text',
        rows: 2,
        description: 'Optional line under the heading. Leave blank for none.',
      }),
    ),
    ...(sourceTo
      ? [
          defineField(
            withGroup({
              name: 'source',
              title: 'Derive from',
              type: 'reference',
              to: sourceTo,
              description: `Fill the row automatically from this. Ignored when ${curatedTitle} below has entries.`,
            }),
          ),
        ]
      : []),
    defineField(
      withGroup({
        name: 'count',
        title: 'How many to show',
        type: 'number',
        initialValue: defaultCount,
        validation: (rule: Rule) => rule.min(1).integer(),
        description: `Number of ${itemNoun} to show when deriving. Ignored when ${curatedTitle} is set.`,
      }),
    ),
    defineField(
      withGroup({
        name: 'curatedItems',
        title: curatedTitle,
        type: 'array',
        of: curatedTo.map((ref) => ({ type: 'reference', to: [ref] })),
        validation: (rule: Rule) => rule.unique(),
        description: `Override. When set, these exact ${itemNoun} show, in this order, and the source and count above are ignored. Leave empty to derive.`,
      }),
    ),
  ]
}
