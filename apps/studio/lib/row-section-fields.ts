import { defineField } from 'sanity'
import type { Rule } from 'sanity'
import { sectionHeaderFields } from './section-header-fields'
import { SECTION_GROUPS } from './section-field-groups'
import {
  hideUnlessCustomList,
  hideWhenCustomList,
  sectionListSourceField,
} from './section-list-source-fields'

/**
 * The row-section field set — Foundations (PROD-2286).
 *
 * A "row" is a section that shows a strip of other documents: a rail of posts, a
 * shelf of products, a set of related solutions. Every row shares the same chrome
 * plus curated-override fields, so they are defined once here and imported by
 * each row section rather than re-typed — the blog's four post rows are the
 * pattern this generalises.
 *
 * **Explicit list source:** when `sourceTo` is set, editors choose Derive from
 * source (chip) vs Custom list. When `pageListChip` is set (document inherit,
 * e.g. case studies), they choose Page field vs Custom. Curation-only rows have
 * no chip — always a custom list.
 */

type RowSectionFieldsOptions = {
  /**
   * Types the `source` reference may point at — what the row derives from
   * (a taxonomy term, a listing page). Omit to leave the row curation-only
   * unless `pageListChip` is set.
   */
  sourceTo?: { type: string }[]
  /**
   * Host-document list inherit (ADR-020 §8). When set, adds `listSource` with
   * a Page field chip instead of derive-from-source.
   */
  pageListChip?: { label: string }
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
  pageListChip,
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

  const usePageList = Boolean(pageListChip)
  const useDerive = Boolean(sourceTo) && !usePageList

  return [
    ...sectionHeaderFields({withSectionGroups}),
    ...(usePageList && pageListChip
      ? [
          sectionListSourceField({
            mode: 'page',
            chipLabel: pageListChip.label,
            group: contentGroup,
          }),
        ]
      : []),
    ...(useDerive
      ? [
          sectionListSourceField({
            mode: 'derive',
            chipLabel: 'Derive from source',
            group: contentGroup,
          }),
          defineField(
            withGroup(contentGroup)({
              name: 'source',
              title: 'Derive from',
              type: 'reference',
              to: sourceTo!,
              description: `Fill the row from this when List source is Derive.`,
              hidden: hideWhenCustomList,
            }),
          ),
          defineField(
            withGroup(contentGroup)({
              name: 'count',
              title: 'How many to show',
              type: 'number',
              initialValue: defaultCount,
              validation: (rule: Rule) => rule.min(1).integer(),
              description: `Number of ${itemNoun} when deriving.`,
              hidden: hideWhenCustomList,
            }),
          ),
        ]
      : []),
    // Curation-only (no source, no page inherit): still show count for legacy rows
    // that had it; only when neither page nor derive mode.
    ...(!usePageList && !useDerive
      ? [
          defineField(
            withGroup(contentGroup)({
              name: 'count',
              title: 'How many to show',
              type: 'number',
              initialValue: defaultCount,
              validation: (rule: Rule) => rule.min(1).integer(),
              description: `Hint for how many ${itemNoun} to show.`,
            }),
          ),
        ]
      : []),
    defineField(
      withGroup(contentGroup)({
        name: 'curatedItems',
        title: curatedTitle,
        type: 'array',
        of: curatedTo.map((ref) => ({type: 'reference', to: [ref]})),
        validation: (rule: Rule) => rule.unique(),
        description: usePageList || useDerive
          ? `Custom ${itemNoun} only. Shown when List source is Custom.`
          : `The ${itemNoun} to show, in order.`,
        ...(usePageList || useDerive
          ? {hidden: hideUnlessCustomList}
          : {}),
      }),
    ),
  ]
}
