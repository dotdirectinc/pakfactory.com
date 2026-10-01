/**
 * Order the Products pinned to a Product Style (PROD-2747).
 *
 * `productStyle.productOrder` is a curated, PARTIAL list of product references.
 * It is order only and never a gate: a product it does not name still appears,
 * alphabetically, after the ones it does. A partial list is therefore the normal
 * state, not a half-finished one.
 *
 * 🔴 D31 named `productStyle.productOrder` and rejected it — as "every product in
 * a style in drag order", an array that is order AND gate, unusable at 200. The
 * shape it prescribed instead is the one implemented here: DERIVE THE SET, CURATE
 * THE HIGHLIGHTS. Membership is a query; this array is only the top of it, capped
 * at 12 in the schema. Do not relax that cap without revisiting D31.
 *
 * This is the TS twin of `orderTypesInCategory` (customization-type-order.ts) and
 * of the two-tier GROQ in `LINE_STYLES` (queries/catalog.ts). It lives in TS rather
 * than GROQ because its consumer assembles its list in JavaScript — see the
 * hand-off note at the bottom of this file.
 *
 * ⚠️ The references in `productOrder` are WEAK, so a deleted product leaves a
 * dangling entry behind rather than blocking the delete. Refs that match no product
 * are dropped here; nothing downstream has to know about them.
 */

export type OrderableProduct = {
  _id: string;
  title?: string | null;
};

/** A `productOrder` entry as it arrives — `productOrder[]{_ref}` or `productOrder[]._ref`. */
export type ProductOrderEntry = string | { _ref?: string | null } | null | undefined;

function refOf(entry: ProductOrderEntry): string | null {
  if (typeof entry === 'string') return entry || null;
  const ref = entry?._ref;
  return typeof ref === 'string' && ref !== '' ? ref : null;
}

function byTitle(a: OrderableProduct, b: OrderableProduct): number {
  const at = a.title?.trim() || a._id;
  const bt = b.title?.trim() || b._id;
  return at.localeCompare(bt);
}

/**
 * Pinned products in drag order, then every other product alphabetically.
 *
 * `productOrder` absent, empty, or naming only products not in `products` all
 * collapse to plain alphabetical — which is the behaviour a style has before
 * anyone pins anything, and the reason this is safe to ship before any consumer
 * reads it.
 *
 * Input order is never trusted: the tail is sorted here rather than assumed.
 */
export function orderProductsInStyle<T extends OrderableProduct>(
  products: readonly T[],
  productOrder: readonly ProductOrderEntry[] | null | undefined,
): T[] {
  const byId = new Map<string, T>();
  for (const product of products) {
    if (product?._id) byId.set(product._id, product);
  }

  const pinned: T[] = [];
  const pinnedIds = new Set<string>();
  for (const entry of productOrder ?? []) {
    const ref = refOf(entry);
    if (!ref || pinnedIds.has(ref)) continue;
    const product = byId.get(ref);
    // No match = a weak reference to a deleted product, or one the caller did not
    // pass because this style is not its primary. Either way it is not ours to
    // render — see the hand-off note below.
    if (!product) continue;
    pinned.push(product);
    pinnedIds.add(ref);
  }

  const rest = [...byId.values()].filter((product) => !pinnedIds.has(product._id));
  rest.sort(byTitle);

  return [...pinned, ...rest];
}

/**
 * ⚠️ HAND-OFF — the style page does not use this yet.
 *
 * `listProductStyleLibrary` (apps/www/src/lib/catalog/catalog.ts) fetches the whole
 * product library once via CATALOG_PRODUCT_LIBRARY_QUERY (`order(title asc)`) and
 * filters it in JavaScript by line slug + style slug. Wiring this up means calling
 * this function on that filtered list with the style's `productOrder`, before
 * `buildProductLibraryResult`.
 *
 * 🔴 And a finding that is NOT this function's to fix. That filter matches on the
 * PRIMARY style only — the library projects `coalesce(productStyle[0],
 * basedOn->productStyle[0])`. `product.productStyle` is an array, so 192 products
 * reference a style in position 1 or 2 and appear on no style page for it at all.
 * Paper Merchandise Bags has 27 products linked and renders 13. Whether that is a
 * bug or intended is a product decision (PROD-2747); the Studio picker is filtered
 * to primary-only so nothing an editor can pin is a silent no-op either way.
 */
