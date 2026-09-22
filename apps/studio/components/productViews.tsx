import { createReferencedByView } from './createReferencedByView'

/**
 * Reverse-reference tabs for the Product tree.
 *
 * Separate from `customizationViews`, which is scoped to the Customization and
 * Property trees. See `createReferencedByView`.
 */

/**
 * THIS document's own `basedOn`, preferring the draft.
 *
 * `$id` is the PUBLISHED id, so a plain `*[_id == $id][0].basedOn._ref` reads the
 * published value. That is wrong twice: it reports the siblings of the base you
 * just rebased AWAY from, and it reads null for a product that has never been
 * published — which is the whole of the first editing session after `+`.
 *
 * Document-level coalesce, not field-level: a draft that CLEARS `basedOn` must
 * read as null rather than falling through to the published value. Same shape as
 * `BASE` in ProductAvailableCustomizationsView and the `basedOn` rule in
 * `product.ts`.
 */
const CURRENT_BASE_REF =
  'coalesce(*[_id == "drafts." + $id][0], *[_id == $id][0]).basedOn._ref'

const PRODUCT_ROW = {
  type: 'product',
  subtitle: 'sku',
  // Only the exceptions, as on the Customization tabs — an active product says nothing.
  badge: 'select(status == "active" => null, status)',
  // `featuredImage` is the card image; `media[0]` is the older fallback.
  thumb: 'coalesce(featuredImage.asset._ref, media[0].asset._ref)',
} as const

// ── Product ↔ product, through `basedOn` ─────────────────────────────────────
/**
 * One tab, both directions. Every inspiration product carries a `basedOn`; the
 * standard it points at carries nothing, so the reverse has never been visible.
 *
 * PROD-2547 made that sharper by design — standard products are edited in the
 * Products workspace and inspiration products in Solutions, and neither list
 * shows the other's rows. From a standard product there is otherwise no path at
 * all to what was built on it.
 *
 * Sections are dropped when empty, so this reads as one list per kind: a standard
 * shows what was built on it, an inspiration product shows where it came from and
 * what it sits beside.
 */
export const ProductInspirationView = createReferencedByView({
  tag: 'product-inspiration',
  sections: [
    // Standard product → what was built on it. Populated on 48 of 275.
    //
    // Deliberately NOT narrowed by `kind == "inspiration"`: `basedOn` is hidden
    // when kind is standard, so a standard product that somehow carries one is
    // invisible everywhere else. Listing it here is how it gets found.
    {
      ...PRODUCT_ROW,
      title: 'Based on this',
      filter: 'basedOn._ref == $id',
    },
    // Inspiration product → the standard it came from. All 59 have one.
    //
    // This restates a field already on the Edit form, and that is the point: it
    // makes the tab say something on every inspiration product rather than only
    // the 16 with siblings, and it is one click to the base. Decided 2026-09-18.
    {
      ...PRODUCT_ROW,
      title: 'Based on',
      filter: `_id == ${CURRENT_BASE_REF}`,
    },
    // Inspiration product → its siblings. Populated on 16 of 59.
    //
    // Both guards are load-bearing, and both failures are silent:
    //
    //   defined(basedOn._ref) — `null == null` is TRUE in GROQ. Without it, a
    //     STANDARD product (null on the right) matches every OTHER standard
    //     product, measured at ~275 rows under a heading that says "same base".
    //
    //   !(_id in [$id, "drafts." + $id]) — `_id != $id` compares against the
    //     PUBLISHED id, so the document's own draft passes it and `dedupeDrafts`
    //     then deliberately keeps drafts. The document lists itself as its own
    //     sibling the moment it has unsaved edits.
    {
      ...PRODUCT_ROW,
      title: 'Others on the same base',
      filter:
        `defined(basedOn._ref) && basedOn._ref == ${CURRENT_BASE_REF} ` +
        `&& !(_id in [$id, "drafts." + $id])`,
    },
  ],
  empty:
    'Nothing here yet. A standard product lists the inspiration products built from it; ' +
    'an inspiration product lists what it came from and the others built from the same base.',
})
