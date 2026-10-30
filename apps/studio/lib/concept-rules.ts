import type { ValidationContext } from 'sanity'

/**
 * Concept link integrity — PROD-3218.
 *
 * A Glossary Term builds its own "Available as packaging" list from the
 * documents that name it: nobody types into that block. That makes it honest by
 * construction, and it makes exactly two mistakes possible, neither of which the
 * schema can prevent on its own.
 *
 * Both are WARNINGS, not errors (Conventions D48): each one is visible on the
 * published page as a duplicate card, so somebody will report it, and an error
 * would block a save that may be legitimately unusual.
 */

const API_VERSION = '2024-01-01'

/** A draft's `_id` carries a `drafts.` prefix its published twin does not. */
function publishedId(id: string | undefined): string | undefined {
  return id ? id.replace(/^drafts\./, '') : undefined
}

/**
 * Reference `_ref`s out of either shape.
 *
 * `productStyle.productLine` is a single reference and `product.productStyle` is
 * an array, so a guard shared between them cannot assume one or the other.
 */
function refsOf(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value]
  return entries
    .map((entry) => publishedId((entry as { _ref?: string } | undefined)?._ref))
    .filter((ref): ref is string => Boolean(ref))
}

/**
 * Guard 1 — the same concept tagged twice down one chain.
 *
 * The authoring rule is "tag at the highest level where the concept is true of
 * everything below it". Tag Tuck End on the style AND on its 39 products and the
 * term page shows the style card beside 39 product cards for one idea.
 *
 * 🔴 The fix is usually upward, not here. Wanting a product tagged when its style
 * already carries the concept means the STYLE tag is wrong — the claim was not
 * true of everything below it. The message says so, because the instinct is to
 * delete the tag you are looking at.
 *
 * Not applied to `productLine`: a line has no parent, so it has nothing to
 * double-tag against.
 *
 * @param parentField the reference field naming the level above — `productLine`
 *                    on a style, `productStyle` on a product.
 */
export function conceptNotAlreadyOnParent(parentField: string) {
  return async (value: unknown, context: ValidationContext): Promise<true | string> => {
    const picked = refsOf(value)
    if (!picked.length) return true

    const doc = context.document as Record<string, unknown> | undefined
    const parents = refsOf(doc?.[parentField])
    if (!parents.length) return true

    const rows = await context
      .getClient({ apiVersion: API_VERSION })
      .fetch<{ title?: string; terms?: { _id: string; term?: string }[] }[]>(
        `*[_id in $parents]{ title, "terms": glossaryTerm[]->{_id, term} }`,
        { parents },
      )

    const clashes = rows.flatMap((row) =>
      (row.terms ?? [])
        .filter((term) => picked.includes(publishedId(term._id) ?? ''))
        .map((term) => ({ concept: term.term ?? 'That concept', parent: row.title ?? 'its parent' })),
    )
    if (!clashes.length) return true

    const { concept, parent } = clashes[0]
    const more = clashes.length > 1 ? ` (and ${clashes.length - 1} more)` : ''
    return (
      `"${concept}" is already on "${parent}"${more}, so the term page would show both. ` +
      'Tag a concept at the highest level where it is true of everything below — remove it ' +
      `here, or remove it from "${parent}" if it is not true of everything in it.`
    )
  }
}

/**
 * Guard 2 — featuring something the derived list already carries.
 *
 * "Featured packaging" is an editorial pick of three to five; "Available as
 * packaging" is every document that names this term. Picking something that is
 * already in the second shows the same card twice on one page.
 *
 * ⚠️ This is the shape that retired `relatedCustomizations`: two blocks of the
 * same cards, one derived and one hand-picked. That field was deleted rather than
 * guarded because it was empty and unread. This one has a job, so it gets a guard
 * instead — the editor only ever fills one of the two lists, which is what makes
 * the pair survivable.
 */
export function featuredNotAlreadyDerived() {
  return async (value: unknown, context: ValidationContext): Promise<true | string> => {
    const picked = refsOf(value)
    if (!picked.length) return true

    const termId = publishedId((context.document as { _id?: string } | undefined)?._id)
    if (!termId) return true

    const rows = await context
      .getClient({ apiVersion: API_VERSION })
      .fetch<{ title?: string }[]>(
        `*[_id in $picked && $termId in glossaryTerm[]._ref]{ title }`,
        { picked, termId },
      )
    if (!rows.length) return true

    const names = rows.map((row) => `"${row.title ?? 'one of these'}"`).join(', ')
    const [verb, pronoun] = rows.length === 1 ? ['names', 'it'] : ['name', 'they']
    return (
      `${names} already ${verb} this term as its concept, so ${pronoun} appear under ` +
      '"Available as packaging" without being picked. Featuring the same thing shows it twice — ' +
      'feature something that list does not already carry.'
    )
  }
}
