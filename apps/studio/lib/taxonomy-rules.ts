import type { ValidationContext } from 'sanity'

/**
 * Taxonomy term integrity — Conventions §4.2.
 *
 * Five parallel taxonomies exist, and until this rule landed nothing said who
 * could add to any of them. That is how a list drifts: two spellings of one
 * idea, each half-used, neither obviously wrong.
 *
 * The near-miss on record: `attribute` "Food Safe" (a Property Value) and
 * `customizationType` "Food-Safe Treatment" (a Customization Type) describe the
 * same idea in two types. Different lists, so not a duplicate — but nothing
 * stopped someone adding "Food-Safe" as a second Property Value.
 */

/**
 * Case- and punctuation-insensitive comparison key.
 *
 * "Food Safe", "Food-Safe" and "food safe" all reduce to `food safe`, so the
 * three cannot coexist in one taxonomy.
 */
function comparisonKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Rejects a term whose title already exists in the same type, ignoring case
 * and punctuation.
 *
 * Compared in JS rather than GROQ because normalising punctuation is not
 * something a query can express — `lower()` alone would let "Food-Safe" past.
 *
 * @param field the type's name field — `title` everywhere except `solution`,
 *              which still calls it `internalTitle` until the rename lands.
 */
export function uniqueTaxonomyTitle(field: string = 'title') {
  return async (value: string | undefined, context: ValidationContext) => {
    // Emptiness is `Rule.required()`'s job, not this rule's.
    if (!value?.trim()) return true

    const doc = context.document as { _id?: string; _type?: string } | undefined
    const type = doc?._type
    if (!type) return true

    const publishedId = doc?._id?.replace(/^drafts\./, '')
    const client = context.getClient({ apiVersion: '2024-01-01' })

    // Exclude both halves of this document's own draft/published pair.
    const siblings = await client.fetch<{ title: string | null }[]>(
      `*[_type == $type && !(_id in [$id, $draftId])]{"title": ${field}}`,
      {
        type,
        id: publishedId ?? '',
        draftId: `drafts.${publishedId ?? ''}`,
      },
    )

    const key = comparisonKey(value)
    const clash = siblings.find((row) => row.title && comparisonKey(row.title) === key)

    return clash
      ? `"${clash.title}" already exists in this list. Terms have to be unique ignoring case and punctuation, so "Food Safe" and "Food-Safe" cannot both exist.`
      : true
  }
}
