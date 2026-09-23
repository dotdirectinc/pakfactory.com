import { defineField } from 'sanity'
import type { Rule } from 'sanity'
import { sectionHeaderFields } from './section-header-fields'
import { SECTION_GROUPS } from './section-field-groups'

/**
 * The row-section field set — Foundations (PROD-2286).
 *
 * A "row" is a section that shows a strip of other documents: a rail of posts, a
 * shelf of products, a set of related solutions. Every row shares the same chrome
 * plus curated-override fields, so they are defined once here and imported by
 * each row section rather than re-typed — the blog's four post rows are the
 * pattern this generalises.
 *
 * The behaviour the fields encode: **curated override with a derive fallback.**
 * Leave the curated list empty and the row fills itself from `source`, newest or
 * highest-ranked first, up to `count`. Fill the curated list and those exact
 * items show, in that order — `source` and `count` are then ignored. An editor
 * gets a good row for free and an exact row when they want one, from one section.
 */

type RowSectionFieldsOptions = {
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
  /**
   * When false, skip in-section Heading/Content/Layout groups (flat form).
   * Defaults to true for www sections.
   */
  withSectionGroups?: boolean
}

/**
 * Shared row fields: section chrome (heading · intro · align · link · borders)
 * plus source, count, curated override. Spread into a row section's `fields`.
 */
export function rowSectionFields({
  sourceTo,
  curatedTo,
  defaultCount = 3,
  curatedTitle = 'Curated items',
  itemNoun = 'items',
  withSectionGroups = true,
}: RowSectionFieldsOptions) {
  const contentGroup = withSectionGroups ? SECTION_GROUPS.content : undefined
  const withGroup =
    (group: string | undefined) =>
    <T extends Record<string, unknown>>(field: T): T =>
      group ? ({...field, group} as T) : field

  return [
    ...sectionHeaderFields({withSectionGroups}),
    ...(sourceTo
      ? [
          defineField(
            withGroup(contentGroup)({
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
      withGroup(contentGroup)({
        name: 'count',
        title: 'How many to show',
        type: 'number',
        initialValue: defaultCount,
        validation: (rule: Rule) => rule.min(1).integer(),
        description: `Number of ${itemNoun} to show when deriving. Ignored when ${curatedTitle} is set.`,
      }),
    ),
    defineField(
      withGroup(contentGroup)({
        name: 'curatedItems',
        title: curatedTitle,
        type: 'array',
        of: curatedTo.map((ref) => ({type: 'reference', to: [ref]})),
        validation: (rule: Rule) => rule.unique(),
        description: `Override. When set, these exact ${itemNoun} show, in this order, and the source and count above are ignored. Leave empty to derive.`,
      }),
    ),
  ]
}
