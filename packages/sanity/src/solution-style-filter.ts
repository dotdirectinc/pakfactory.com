/**
 * Solution Style — how a stored filter resolves to products.
 *
 * A Solution Style (`solutionStyle`) is the second level under a Solution, and
 * it is a STORED FILTER, not a tag. Products are never tagged to one; membership
 * is computed. Two sources for one membership is the failure the type is shaped
 * to avoid, so there must never be a `product.solutionStyle` field.
 *
 * This module is the single definition of what "matches" means. It lives in
 * shared code — not in the Studio — because the Studio's match count and the
 * eventual collection page have to agree exactly. A second copy in the front end
 * is how the count on the form starts disagreeing with the grid on the page, and
 * nobody notices until an editor reports a number that "looks wrong".
 *
 * Same reasoning, same place, as `dimension-inputs`.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * The shape of the query:
 *
 *   parent solution  AND  kind == "inspiration"  AND  (
 *         line matches  OR  style matches  OR  keyword matches
 *   )  AND NOT excluded
 *
 * ⚠️ OR across the three conditions, not AND. "Retail Snack Displays" is
 * everything in the Cardboard Displays line PLUS everything in the Carton Trays
 * and Display-Ready Cartons styles, which sit under a different line. An AND
 * would return nothing.
 *
 * ⚠️ The parent solution and `kind == "inspiration"` are NOT stored on the
 * document. The parent reference already carries the first, and the second
 * follows from it: only inspiration products carry `product.solutions` (58 of 58
 * inspiration, 0 of 252 standard), so a solution-scoped query is
 * inspiration-scoped by construction. Storing either would be one rule copied
 * onto every document. If standard products are ever tagged to solutions, `kind`
 * becomes a real choice and earns a field — until then it belongs here.
 */

/** The filter object as authored on a `solutionStyle` document. */
export type SolutionStyleFilter = {
  productLines?: { _ref: string }[]
  productStyles?: { _ref: string }[]
  keywords?: string[]
}

export type SolutionStyleFilterParams = {
  solutionId: string
  lineIds: string[]
  styleIds: string[]
  keywords: string[]
  excludedIds: string[]
}

/**
 * The sort applied to a collection's products.
 *
 * `_createdAt` descending so newly uploaded work surfaces first, `title` ascending
 * as a deterministic tiebreak.
 *
 * 🔴 `_createdAt`, NEVER `_updatedAt`. Re-saving a product must not bounce it to
 * the top of every collection it appears in.
 *
 * Known weakness, stated so nobody rediscovers it as a bug: a bulk import gives
 * hundreds of products near-identical timestamps, so within one batch the tiebreak
 * is the real order — it degrades to alphabetical, which is what sorting by title
 * alone would have given anyway. Strictly better than that, never worse. When
 * ordering matters for real the answer is a per-collection pinned list, not a
 * different sort key.
 */
export const SOLUTION_STYLE_ORDER = 'order(_createdAt desc, title asc)'

/**
 * Turn an authored keyword into a GROQ `match` pattern.
 *
 * `pizza box` → `pizza box*`. The wildcard is appended HERE and never stored, so
 * no document carries a `*` that could be wrong and the rule changes in one place.
 *
 * Prefix on the final token only, by design: it catches "Boxes" without catching
 * "Pizzeria". When a stem does not catch, the fix is a second keyword.
 *
 * ⚠️ GROQ `match` is a token SET, not a phrase. Every token must be present, in
 * any order and not necessarily adjacent — so `pizza box*` also matches
 * "Pizza Presentation Box". That is intended for a loose keyword, and surprising
 * the first time you see it.
 */
export function keywordPattern(keyword: string): string | null {
  const tokens = keyword.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  return [...tokens.slice(0, -1), `${tokens[tokens.length - 1]}*`].join(' ')
}

/** Read the params a filter resolves with, from the authored document. */
export function filterParams(
  solutionId: string,
  filter: SolutionStyleFilter | undefined,
  excluded: { _ref: string }[] | undefined,
): SolutionStyleFilterParams {
  return {
    solutionId,
    lineIds: (filter?.productLines ?? []).map((r) => r._ref).filter(Boolean),
    styleIds: (filter?.productStyles ?? []).map((r) => r._ref).filter(Boolean),
    keywords: (filter?.keywords ?? []).map(keywordPattern).filter((p): p is string => !!p),
    excludedIds: (excluded ?? []).map((r) => r._ref).filter(Boolean),
  }
}

/** True when at least one condition is set. An empty filter must never run: it
 *  would resolve to the parent solution's entire list and duplicate the page
 *  above it. Schema validation blocks authoring one; this blocks querying one. */
export function hasAnyCondition(p: SolutionStyleFilterParams): boolean {
  return p.lineIds.length > 0 || p.styleIds.length > 0 || p.keywords.length > 0
}

/**
 * The GROQ filter expression (no projection, no ordering).
 *
 * Only the conditions that are actually set are emitted, so an unused array never
 * contributes an always-false clause. Returns null when nothing is set — callers
 * must treat that as "no query", not as "match everything".
 */
export function solutionStyleProductFilter(p: SolutionStyleFilterParams): string | null {
  if (!hasAnyCondition(p)) return null

  const any: string[] = []
  if (p.lineIds.length) any.push('productLine._ref in $lineIds')
  if (p.styleIds.length) any.push('count(productStyle[._ref in $styleIds]) > 0')
  // One clause per keyword: `match` takes a single pattern, and OR-ing them is
  // what makes several keywords widen the collection rather than narrow it.
  p.keywords.forEach((_, i) => any.push(`title match $kw${i}`))

  return [
    '_type == "product"',
    'kind == "inspiration"',
    '$solutionId in solutions[]._ref',
    `(${any.join(' || ')})`,
    '!(_id in $excludedIds)',
  ].join(' && ')
}

/** Query params for `solutionStyleProductFilter`, keyword patterns numbered to
 *  match the clauses it generates. */
export function solutionStyleQueryParams(
  p: SolutionStyleFilterParams,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {
    solutionId: p.solutionId,
    lineIds: p.lineIds,
    styleIds: p.styleIds,
    excludedIds: p.excludedIds,
  }
  p.keywords.forEach((pattern, i) => {
    params[`kw${i}`] = pattern
  })
  return params
}
