/**
 * The nine concept Glossary Terms, and what counts as a mirror (PROD-3209).
 *
 * Three migrations read this — repoint, clear, delete — and they have to agree
 * on both sets exactly, or the clear strands a link the repoint wanted or the
 * delete removes a term something still points at. One definition, imported.
 *
 * ── The mapping is a rule, not a list ───────────────────────────────────────
 *
 * The nine concepts correspond one-to-one with nine of the 34 Customization
 * Types, so an Option's concept is decided by its `type`, never by matching its
 * title. A title match finds nothing at all here: no Option contains the word
 * "paperboard" — they are FBB, URB, SBS, Metallic Board.
 *
 * The key is the TYPE slug, the value is the TERM slug, and they differ in one
 * place: the Type is `chipboards`, plural, and the term is `chipboard`.
 */
export const TYPE_TO_CONCEPT = Object.freeze({
  'paperboard': 'paperboard',
  'chipboards': 'chipboard',
  'corrugated-board': 'corrugated-board',
  'foam': 'foam',
  'blister-plastic': 'blister-plastic',
  'molded-pulp': 'molded-pulp',
  'ink': 'ink',
  'lamination': 'lamination',
  'foiling': 'foiling',
})

/** The nine Customization Type slugs whose Options belong to a concept. */
export const CONCEPT_TYPE_SLUGS = Object.freeze(Object.keys(TYPE_TO_CONCEPT))

/** The nine Glossary Term slugs the Options point at. */
export const CONCEPT_TERM_SLUGS = Object.freeze([...new Set(Object.values(TYPE_TO_CONCEPT))])

/**
 * What makes a Glossary Term a MIRROR — one of the 243 that duplicate a single
 * Option and are being deleted.
 *
 * `!defined(group)` is the whole test, and it is exact today: the nine concepts
 * were seeded with a group and all 243 mirrors have none, because `group` was a
 * hardcoded five-value list nobody ever filled.
 *
 * ⚠️ It is a proxy, and it is the right one only while `group` means "a term
 * somebody authored deliberately". A genuinely new term published without a
 * group would read as a mirror here. That is why every script using this
 * prints the full list in its dry run, and why the delete refuses to remove
 * anything still referenced.
 */
export const MIRROR_TERM_FILTER = '_type == "glossaryTerm" && !defined(group)'

/** Deterministic, so a re-run produces the identical array. Matches migrate-glossary-term-array. */
export function keyFor(ref) {
  return `gt-${String(ref).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`
}

/** Drafts and published documents share an identity for reference purposes. */
export const bareId = (id) => String(id).replace(/^drafts\./, '')

/** A GROQ array literal, for inlining a slug set into a filter. */
export const groqList = (values) => JSON.stringify([...values])
