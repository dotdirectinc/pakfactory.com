/**
 * TS mirrors of the catalog GROQ gates in `packages/sanity/src/queries/catalog.ts`
 * (`LISTED_STATUS`, `HAS_PAGE_STATUS`, `ORDERABLE_STATUS`, `LINE_STYLE_*`,
 * `SOLUTION_ACTIVE`, `CUSTOMIZATION_TAXONOMY_ACTIVE`, `HAS_DETAIL_PAGE`) plus the
 * type-specific chrome gates. Keep in sync with that file — do not invent a third
 * matrix in apps.
 *
 * Listings filter in GROQ. CURATED links (nav, hero slides, catalog rows) are
 * authored, so www fetches the visibility fields and decides here instead.
 *
 * ── One vocabulary (PROD-2845) ───────────────────────────────────────────────
 *
 *   active · coming-soon · discontinued · not-active · active-internal
 *
 * `customerFacing` and `hasPage` are GONE from every catalog type. (Expertise
 * Service still has its own `hasPage` and is deliberately out of scope.)
 *
 * 🔴 Every predicate below is a WHITELIST — it names the states that ARE visible.
 * That is what let two new values join the vocabulary without touching the product
 * gates at all. Never write `status !== 'not-active'`: the next value added leaks.
 */

/** Page-bearing `appearsIn` values — mirror GROQ `HAS_DETAIL_PAGE` (PROD-2732). */
const PAGE_BEARING_APPEARS_IN = new Set([
  'configurable-with-page',
  'not-configurable-with-page',
]);

export type CatalogVisibilityTarget = {
  _type?: string | null;
  status?: string | null;
  /** Expertise Service only — every catalog type moved to `status` in PROD-2845. */
  hasPage?: boolean | null;
  /** Customization options — PROD-2732; answers *where* an option appears, not *what state* it is in. */
  appearsIn?: string | null;
  /**
   * What the document's own status cannot say: whether its PARENTS let it show — rule 1
   * (a product with every parent off) and R1 (a child of a closed exclusive parent).
   * Projected by GROQ `LINK_PARENTS_ON`. Unset reads as true, so projections that do
   * not carry it keep today's behaviour.
   */
  parentsOn?: boolean | null;
};

/** Mirror GROQ `HAS_DETAIL_PAGE` for customization options. */
export function hasCustomizationDetailPage(
  appearsIn: string | null | undefined,
): boolean {
  return appearsIn != null && PAGE_BEARING_APPEARS_IN.has(appearsIn);
}

/** Unset reads as visible for the types that have always allowed it. */
const unsetOr = (status: string | null | undefined, ...allowed: string[]): boolean =>
  status == null || status === '' ? true : allowed.includes(status);

/**
 * Mirror GROQ `LISTED_STATUS` — unset / active / coming-soon.
 * Products, bundles and expertise stages: a coming-soon product lists with a badge.
 */
export function isListedCatalogStatus(
  status: string | null | undefined,
): boolean {
  return unsetOr(status, 'active', 'coming-soon');
}

/** Mirror GROQ `HAS_PAGE_STATUS` — adds discontinued, which keeps its page for search. */
export function hasCatalogPageStatus(status: string | null | undefined): boolean {
  return unsetOr(status, 'active', 'coming-soon', 'discontinued');
}

/** Alias matching the GROQ constant name. */
export const isHasPageStatus = hasCatalogPageStatus;

/** Mirror GROQ `ORDERABLE_STATUS` — Active only. Coming soon lists but cannot be bought. */
export function isOrderableStatus(status: string | null | undefined): boolean {
  return unsetOr(status, 'active');
}

/**
 * Mirror GROQ `LINE_STYLE_LISTED` — unset / active / active-internal.
 *
 * `active-internal` is listed on purpose: it still answers as a catalog filter, which
 * is how a specialty line keeps its products reachable while having no page of its
 * own (R4). Gating a product card's line ref on anything stricter takes the products
 * off the site with the parent.
 */
export function isLineStyleListed(status: string | null | undefined): boolean {
  return unsetOr(status, 'active', 'active-internal');
}

/** Mirror GROQ `LINE_STYLE_HAS_PAGE` — unset / active / discontinued. */
export function lineStyleHasPage(status: string | null | undefined): boolean {
  return unsetOr(status, 'active', 'discontinued');
}

/** Alias matching the GROQ constant name. */
export const isLineStyleHasPage = lineStyleHasPage;

/** Mirror GROQ `LINE_STYLE_ACTIVE` — listed AND page-bearing. The gate for a LINK. */
export function isLineStyleActive(status: string | null | undefined): boolean {
  return unsetOr(status, 'active');
}

/**
 * Mirror GROQ `SOLUTION_ACTIVE` — Active only, with NO unset arm.
 *
 * `status` replaced `hasPage`, which defaulted to false: a page was what a term
 * earned. An un-migrated solution must read as having no page, exactly as before.
 */
export function isSolutionActive(status: string | null | undefined): boolean {
  return status === 'active';
}

/**
 * Mirror GROQ `PARENT_STYLE_ON` — a style still anchors its products unless it is
 * Coming soon or Not active. Discontinued keeps its page; Active (Internal) passes
 * through (R4). Richard + Eric, 2026-10-06.
 */
export function isStyleParentOn(status: string | null | undefined): boolean {
  return unsetOr(status, 'active', 'active-internal', 'discontinued');
}

/** Mirror GROQ `PARENT_SOLUTION_ON` — Active only, same as {@link isSolutionActive}. */
export function isSolutionParentOn(status: string | null | undefined): boolean {
  return isSolutionActive(status);
}

/**
 * Mirror GROQ `INSPIRATION_BASE_OPEN` — a preset follows its base product: the base must
 * be Active or Active (Internal), and so must the base's line (Richard + Eric, 2026-10-06).
 */
export function isInspirationBaseOpen(
  baseStatus: string | null | undefined,
  baseLineStatus: string | null | undefined,
): boolean {
  return unsetOr(baseStatus, 'active', 'active-internal') && unsetOr(baseLineStatus, 'active', 'active-internal');
}

/**
 * Mirror GROQ `PRODUCT_HAS_PARENT_ON` — rule 1: a product whose every parent is off is
 * hidden. Inspiration products are anchored by their solutions, standard ones by styles.
 */
export function productHasParentOn(product: {
  kind?: string | null;
  styleStatuses?: (string | null | undefined)[] | null;
  solutionStatuses?: (string | null | undefined)[] | null;
}): boolean {
  return product.kind === 'inspiration'
    ? (product.solutionStatuses ?? []).some(isSolutionParentOn)
    : (product.styleStatuses ?? []).some(isStyleParentOn);
}

/** Mirror GROQ `CUSTOMIZATION_TAXONOMY_ACTIVE` — no off switch existed before, so unset stays visible. */
export function isCustomizationTaxonomyActive(
  status: string | null | undefined,
): boolean {
  return unsetOr(status, 'active');
}

/**
 * Whether a document may be LINKED to from www chrome — nav entries, curated hero
 * slides, catalog rows. Unknown `_type` passes through (non-catalog links).
 *
 * 🔴 Returns false for a coming-soon line or solution, and that is load-bearing.
 * Curated links DROP such a target (decided 2026-10-05): a nav entry is a signpost
 * and reads fine unlinked, but a hero slide is a call to action and one that cannot
 * be clicked is a dead end. The nav's third state comes from
 * {@link catalogTargetNavState} — do NOT widen this function to produce it, or every
 * curated surface starts advertising pages that do not exist.
 */
export function isCatalogTargetVisible(
  doc: CatalogVisibilityTarget | null | undefined,
): boolean {
  if (!doc?._type) return true;
  if (doc.parentsOn === false) return false;

  switch (doc._type) {
    case 'productLine':
    case 'productStyle':
      // A link needs both: active-internal has no page, discontinued is not promoted.
      return isLineStyleActive(doc.status);
    case 'product':
    case 'bundle':
      return isListedCatalogStatus(doc.status);
    case 'customizationOption':
      return hasCustomizationDetailPage(doc.appearsIn) && doc.status === 'active';
    case 'customizationCategory':
    case 'customizationType':
      return isCustomizationTaxonomyActive(doc.status);
    case 'solution':
    case 'solutionStyle':
      return isSolutionActive(doc.status);
    case 'expertiseService':
      // Out of scope for PROD-2845 — still its own boolean.
      return doc.hasPage === true && isListedCatalogStatus(doc.status);
    case 'expertiseStage':
      return isListedCatalogStatus(doc.status);
    default:
      return true;
  }
}

/** What the navigation should do with a target. */
export type CatalogNavState = 'linked' | 'unlinked' | 'hidden';

/**
 * Three-state gate for the NAVIGATION only (PROD-2846).
 *
 * A coming-soon Product Line or Solution keeps its nav entry but does not link
 * anywhere, because its page does not exist. That unlinked entry is the only thing
 * separating Coming soon from Not active on those two types — without it the two
 * states are indistinguishable and the value is decorative.
 *
 * Only Product Line and Solution get `unlinked`: styles have no nav entry to show,
 * and a coming-soon PRODUCT keeps its real page, so it is plainly `linked`.
 *
 * ⚠️ Every other surface uses {@link isCatalogTargetVisible} and drops what this
 * would call `unlinked`.
 */
export function catalogTargetNavState(
  doc: CatalogVisibilityTarget | null | undefined,
): CatalogNavState {
  if (isCatalogTargetVisible(doc)) return 'linked';
  if (
    (doc?._type === 'productLine' || doc?._type === 'solution') &&
    doc?.status === 'coming-soon'
  ) {
    return 'unlinked';
  }
  return 'hidden';
}
