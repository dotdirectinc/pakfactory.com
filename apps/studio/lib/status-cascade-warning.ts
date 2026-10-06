import type { ValidationContext } from 'sanity'

import { isRestrictingStatus } from './catalog-status'

/**
 * R5 — warn on write, never block (PROD-2845).
 *
 * Setting a parent to a restricting status while active children sit beneath it
 * warns and NAMES them. It does not refuse, for two reasons:
 *
 *   A hard block makes top-down reorganisation impossible. Retiring a line would
 *   mean clearing forty products first, one save at a time, with the line left
 *   half-wrong in between.
 *
 *   Studio validation cannot see a child added LATER. A block would therefore
 *   buy a guarantee it cannot keep, while reading as though it had. What
 *   actually guarantees correctness is R1/R2 in the queries, which run on every
 *   read; this warning only tells an editor what they are about to affect.
 *
 * 🔴 Reads the PUBLISHED children deliberately. A strong reference resolves
 * against the published dataset, so published state is what decides whether a
 * route exists. An unpublished draft edit is not yet that fact. The document id
 * is stripped of its `drafts.` prefix for the same reason.
 *
 * The one validation in this model that IS an error lives in `product.ts`:
 * `active-internal` on an inspiration product. Nothing else is involved there —
 * it is one document contradicting itself — so none of the reasoning above
 * applies.
 */

/** How many children to name before summarising; a warning listing 75 products is unreadable. */
const MAX_NAMED = 8

const publishedId = (id: string | undefined): string | undefined =>
  id ? id.replace(/^drafts\./, '') : undefined

const nameList = (names: string[]): string => {
  const shown = names.slice(0, MAX_NAMED).join(', ')
  const rest = names.length - MAX_NAMED
  return rest > 0 ? `${shown} and ${rest} more` : shown
}

/**
 * Build a `Rule.custom` validator that warns when this document's status would
 * restrict children that are still active.
 *
 * @param query GROQ taking `$id` (the published document id) and returning rows
 *   with a `title`. It must select only the children that would actually be
 *   affected — the helper does not filter.
 * @param describe Turns the affected names into the warning an editor reads.
 *
 * @example
 *   validation: (Rule) =>
 *     Rule.custom(
 *       restrictingChildrenWarning({
 *         query: `*[_type == "productStyle" && productLine._ref == $id && ...]{title}`,
 *         describe: (names) => `Hiding this line also hides ${names}.`,
 *       }),
 *     ).warning(),
 */
export const restrictingChildrenWarning =
  (opts: {
    query: string
    describe: (names: string) => string
    /** Narrower trigger than "any restricting status" — e.g. only the values that switch a parent off. */
    when?: (value: unknown) => boolean
  }) =>
  async (value: unknown, context: ValidationContext): Promise<true | string> => {
    if (!(opts.when ?? isRestrictingStatus)(value)) return true

    const id = publishedId(context.document?._id as string | undefined)
    if (!id) return true

    const client = context.getClient({ apiVersion: '2024-01-01' })
    const rows = await client.fetch<{ title?: string }[]>(opts.query, { id })
    if (!rows?.length) return true

    return opts.describe(nameList(rows.map((r) => r.title ?? 'untitled')))
  }
