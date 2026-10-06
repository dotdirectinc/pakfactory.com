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
 *   parent solution  AND  KIND_INSPIRATION  AND  (
 *         line matches  OR  style matches  OR  keyword matches
 *   )  AND NOT excluded
 *
 * ⚠️ OR across the three conditions, not AND. "Retail Snack Displays" is
 * everything in the Cardboard Displays line PLUS everything in the Carton Trays
 * and Display-Ready Cartons styles, which sit under a different line. An AND
 * would return nothing.
 *
 * ⚠️ The parent solution and inspiration kind are NOT stored on the document.
 * The parent reference already carries the first; kind uses
 * {@link KIND_INSPIRATION} so solution surfaces stay inspiration-only even if a
 * standard product is ever tagged to a solution.
 */

import {KIND_INSPIRATION} from './product-kind';
import { isListedCatalogStatus } from './catalog-visibility'

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
  // `_ref`, not `._ref`: inside a GROQ filter the attribute is bare. The dotted form is a parse
  // error, which made every collection with a style condition fail to load (PROD-2605).
  if (p.styleIds.length) any.push('count(productStyle[_ref in $styleIds]) > 0')
  // One clause per keyword: `match` takes a single pattern, and OR-ing them is
  // what makes several keywords widen the collection rather than narrow it.
  p.keywords.forEach((_, i) => any.push(`title match $kw${i}`))

  return [
    '_type == "product"',
    KIND_INSPIRATION,
    '$solutionId in solutions[]._ref',
    // Listed: active and coming soon (badged). A discontinued product keeps its page but
    // leaves the lists, and not-active / active-internal are off the site entirely —
    // all three fall out of this whitelist without being named (PROD-2845).
    '(!defined(status) || status in ["active", "coming-soon"])',
    // Rule 1 (2026-10-06): an inspiration product whose every solution is off is hidden.
    // Mirrors PRODUCT_HAS_PARENT_ON's inspiration arm in queries/catalog.ts.
    'count(solutions[@->status == "active"]) > 0',
    // A preset follows its base product: hidden when the base, or the base's line, is off.
    // Mirrors INSPIRATION_BASE_OPEN in queries/status-gates.ts.
    'defined(basedOn->_id) && (!defined(basedOn->status) || basedOn->status in ["active", "active-internal"]) && (!defined(basedOn->productLine->status) || basedOn->productLine->status in ["active", "active-internal"])',
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

/**
 * Product fields needed to evaluate membership against a Solution Style filter
 * without running GROQ (e.g. inspiration PDP breadcrumb — PROD-2763).
 */
export type SolutionStyleMatchProduct = {
  id: string
  kind: string
  title: string
  solutionIds: string[]
  lineId: string | null
  styleIds: string[]
  status?: string | null
}

/**
 * Whether a title matches a `keywordPattern()` string (e.g. `Bakery Bag*`).
 * Mirrors GROQ `match` as a token set: every pattern token must appear in the
 * title; the last token may be a prefix when it ends with `*`.
 */
export function titleMatchesKeywordPattern(
  title: string,
  pattern: string,
): boolean {
  const titleTokens = title.toLowerCase().split(/\s+/).filter(Boolean)
  const patternTokens = pattern.trim().split(/\s+/).filter(Boolean)
  if (titleTokens.length === 0 || patternTokens.length === 0) return false

  return patternTokens.every((raw, index) => {
    const isLast = index === patternTokens.length - 1
    const prefix = isLast && raw.endsWith('*')
    const token = (prefix ? raw.slice(0, -1) : raw).toLowerCase()
    if (!token) return false
    return titleTokens.some((t) => (prefix ? t.startsWith(token) : t === token))
  })
}

/**
 * Same membership rules as {@link solutionStyleProductFilter}, for one product.
 * Returns false when the filter has no conditions (empty filter must not match).
 */
export function productMatchesSolutionStyleFilter(
  product: SolutionStyleMatchProduct,
  params: SolutionStyleFilterParams,
): boolean {
  if (!hasAnyCondition(params)) return false
  if (product.kind !== 'inspiration') return false
  if (!product.solutionIds.includes(params.solutionId)) return false
  // The shared mirror, not a local re-statement of the same matrix.
  if (!isListedCatalogStatus(product.status)) return false
  if (params.excludedIds.includes(product.id)) return false

  const lineMatch =
    params.lineIds.length > 0 &&
    product.lineId != null &&
    params.lineIds.includes(product.lineId)
  const styleMatch =
    params.styleIds.length > 0 &&
    product.styleIds.some((id) => params.styleIds.includes(id))
  const keywordMatch =
    params.keywords.length > 0 &&
    params.keywords.some((kw) => titleMatchesKeywordPattern(product.title, kw))

  return lineMatch || styleMatch || keywordMatch
}
