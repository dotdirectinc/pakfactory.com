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

/**
 * Same rule, scoped to a PARENT reference rather than to the whole type.
 *
 * For nine of the ten taxonomies the type is the list, and `uniqueTaxonomyTitle`
 * above is right. `propertyValue` is the exception: a value cannot exist outside
 * a Property (the reference is required), so its identity is
 * **(Property, title)** rather than title alone. Board Colour's *Gold* and Foil
 * Colour's *Gold* are two terms in two lists that happen to share a word — the
 * same relationship `kindOf` already models as same-Property-only.
 *
 * Decided with Eric + Richard, 2026-08-21. §4.2's own worked example is a
 * within-list case — "Food Safe" against "Food-Safe" — so scoping to the parent
 * serves the rule's stated purpose exactly, and a type-wide block was broader
 * than the reason given for it.
 *
 * Two severities, because the two cases are different:
 *
 *   error    same title, same Property  — a genuine duplicate
 *   warning  same title, other Property — usually fine, occasionally the
 *            "Food Safe exists in two lists" drift, which is worth a look but
 *            must not block a legitimate Gold/Gold
 *
 * Returning a `warning` from `Rule.custom` requires the caller to chain
 * `.warning()`, which cannot be mixed with an error in one rule — so this
 * returns a discriminated result and the schema wires up two rules from it.
 */
export type ScopedTitleCheck =
  | { ok: true }
  | { level: 'error' | 'warning'; message: string }

export async function checkScopedTaxonomyTitle(
  value: string | undefined,
  context: ValidationContext,
  scopeField: string,
  scopeLabel: string,
): Promise<ScopedTitleCheck> {
  if (!value?.trim()) return { ok: true }

  const doc = context.document as Record<string, unknown> | undefined
  const type = doc?._type as string | undefined
  if (!type) return { ok: true }

  const scopeRef = (doc?.[scopeField] as { _ref?: string } | undefined)?._ref
  const publishedId = (doc?._id as string | undefined)?.replace(/^drafts\./, '')
  const client = context.getClient({ apiVersion: '2024-01-01' })

  const siblings = await client.fetch<
    { title: string | null; scope: string | null; scopeTitle: string | null }[]
  >(
    `*[_type == $type && !(_id in [$id, $draftId])]{
       "title": title,
       "scope": ${scopeField}._ref,
       "scopeTitle": ${scopeField}->title
     }`,
    { type, id: publishedId ?? '', draftId: `drafts.${publishedId ?? ''}` },
  )

  const key = comparisonKey(value)
  const matches = siblings.filter((row) => row.title && comparisonKey(row.title) === key)
  if (matches.length === 0) return { ok: true }

  // A value with no parent yet can't be scoped, so treat any match as a clash
  // rather than waving it through on a technicality.
  const sameScope = scopeRef
    ? matches.find((m) => m.scope === scopeRef)
    : matches[0]

  if (sameScope) {
    return {
      level: 'error',
      message:
        `"${sameScope.title}" already exists in ${sameScope.scopeTitle ?? `this ${scopeLabel}`}. ` +
        `Terms have to be unique within a ${scopeLabel}, ignoring case and punctuation — ` +
        `"Food Safe" and "Food-Safe" cannot both exist in one.`,
    }
  }

  const others = matches
    .map((m) => m.scopeTitle)
    .filter(Boolean)
    .join(', ')

  return {
    level: 'warning',
    message:
      `"${value}" also exists in ${others || `another ${scopeLabel}`}. That is allowed — ` +
      `the same term can sit under more than one ${scopeLabel} — but check these are ` +
      `genuinely different things, and not one idea filed twice.`,
  }
}
