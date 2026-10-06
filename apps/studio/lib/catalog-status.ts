/**
 * The one catalog status vocabulary (PROD-2845).
 *
 * `status` answers a single question — **is this offered, and how?** — on every
 * catalog type. It replaced `customerFacing` (product / line / style) and
 * `hasPage` (solution), which spelled the same off switch two different ways
 * while Solution Style, Customization Category and Customization Type had no off
 * switch at all.
 *
 * Merging them was safe because the two fields never once disagreed: across both
 * datasets 232 documents carried `customerFacing: false` and every one of them
 * also carried `status: "active"`.
 *
 * ── Each type offers a SUBSET, and every omission is a decision ──────────────
 *
 * Build a type's list from the exported sets below rather than hand-rolling one,
 * so a type cannot quietly drift from the model. The reasons for the omissions:
 *
 *   Solution / Solution Style have no Discontinued — "we no longer serve this
 *     industry" is a worse message than silence. Same argument that took
 *     coming-soon and discontinued off Customization Option in PROD-2733.
 *   Customization Category / Type have neither Discontinued nor Coming soon —
 *     there is no lifecycle to model; a category is offered or it is internal.
 *   Inspiration Product has no Active (Internal) — see INSPIRATION_STATUS_LIST.
 *
 * 🔴 `active-internal` is NOT a second way to say `not-active`. An Active
 * (Internal) document is hidden but still works as STRUCTURE — its children keep
 * their own status, it still answers as a catalog filter, it is still a valid
 * `basedOn` target. `not-active` takes its children down with it. That
 * difference is the whole reason both values exist; see RESTRICTING_STATUSES.
 */

/** Every value in the vocabulary. */
export const CATALOG_STATUS = {
  active: 'active',
  comingSoon: 'coming-soon',
  discontinued: 'discontinued',
  notActive: 'not-active',
  activeInternal: 'active-internal',
} as const

export type CatalogStatus = (typeof CATALOG_STATUS)[keyof typeof CATALOG_STATUS]

/** Display labels, exported so document previews can show the same words as the picker. */
export const STATUS_TITLES: Record<CatalogStatus, string> = {
  'active': 'Active',
  'coming-soon': 'Coming soon',
  'discontinued': 'Discontinued',
  'not-active': 'Not active',
  'active-internal': 'Active (Internal)',
}

const option = (value: CatalogStatus) => ({ title: STATUS_TITLES[value], value })

/**
 * Product Line · Product Style · Standard Product — all five.
 *
 * Inspiration products share this document type and must NOT offer
 * `active-internal`; `product.ts` enforces that with a validation error rather
 * than a second list, because one field cannot carry two option lists.
 */
export const FULL_STATUS_LIST = [
  option(CATALOG_STATUS.active),
  option(CATALOG_STATUS.comingSoon),
  option(CATALOG_STATUS.discontinued),
  option(CATALOG_STATUS.notActive),
  option(CATALOG_STATUS.activeInternal),
]

/** Solution · Solution Style — lifecycle without a public retirement. */
export const TAXONOMY_STATUS_LIST = [
  option(CATALOG_STATUS.active),
  option(CATALOG_STATUS.comingSoon),
  option(CATALOG_STATUS.notActive),
]

/** Customization Category · Customization Type — offered, or internal. */
export const ON_OFF_STATUS_LIST = [
  option(CATALOG_STATUS.active),
  option(CATALOG_STATUS.notActive),
]

/**
 * The statuses that take a document's children down with it (R1).
 *
 * 🔴 `active-internal` is deliberately absent — that is R4, the one exception,
 * and the reason the value exists at all. Read this set rather than testing for
 * the values you want to exclude: a value added later is restricting by default,
 * which fails in the quiet direction instead of publishing something.
 */
export const RESTRICTING_STATUSES: readonly CatalogStatus[] = [
  CATALOG_STATUS.comingSoon,
  CATALOG_STATUS.discontinued,
  CATALOG_STATUS.notActive,
]

/**
 * Does this status switch a product's PARENT off (Richard + Eric, 2026-10-06)? Coming
 * soon and Not active only — mirrors `PARENT_STYLE_ON` / `PARENT_SOLUTION_ON` in
 * packages/sanity. Discontinued keeps its page and still anchors the product.
 */
export const isParentOffStatus = (value: unknown): boolean =>
  value === CATALOG_STATUS.comingSoon || value === CATALOG_STATUS.notActive

/** Does this status restrict the documents beneath it? Unset reads as Active. */
export const isRestrictingStatus = (value: unknown): boolean =>
  typeof value === 'string' && RESTRICTING_STATUSES.includes(value as CatalogStatus)

/**
 * Does a Product Line or Product Style have a page of its own?
 *
 * Discontinued is in the set on purpose: the page stays live and says so, which
 * is the whole point of the value — it keeps the URL indexable after the line
 * stops being listed. Coming soon is NOT, because there is nothing to show yet.
 *
 * Names the statuses that DO have a page rather than excluding the ones that do
 * not, so an unknown or future value reads as "no page" instead of publishing one.
 */
export const hasLineStylePage = (value: unknown): boolean =>
  value == null ||
  value === CATALOG_STATUS.active ||
  value === CATALOG_STATUS.discontinued

/**
 * Does a Solution or Solution Style have a page of its own? Active only.
 *
 * A coming-soon solution is a nav signpost, not a page — it has no Discontinued
 * state to keep a URL alive for, so Active is the whole set.
 */
export const hasSolutionPage = (value: unknown): boolean =>
  value === CATALOG_STATUS.active

/** Shared tail for every `status` field description, so the five values read the same everywhere. */
export const STATUS_DESCRIPTION_TAIL =
  'Active (Internal) hides the page but keeps this working as structure — its children stay visible. ' +
  'Not active hides it and everything beneath it.'
