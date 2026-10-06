/**
 * Order the Options inside a Customization Type (PROD-2748).
 *
 * `customizationType.optionOrder` is a curated, PARTIAL list of option references.
 * It is order only and never a gate: an option it does not name still appears,
 * alphabetically, after the ones it does. A partial list is therefore the normal
 * state, not a half-finished one.
 *
 * The twin of `orderTypesInCategory` (customization-type-order.ts) one level up, and
 * of `orderProductsInStyle` (product-order.ts). It lives in TS rather than GROQ
 * because options are never fetched per type — see the hand-off note below.
 *
 * Unlike `productStyle.productOrder`, this field carries no `Rule.max()`: a type
 * holds 22 options at most, which is the bounded-and-small case an ordered array is
 * for, so there is nothing to cap.
 *
 * ⚠️ The references in `optionOrder` are WEAK, so a deleted option leaves a dangling
 * entry behind rather than blocking the delete. Refs that match no option are
 * dropped here; nothing downstream has to know about them.
 */

export type OrderableOption = {
  _id: string;
  title?: string | null;
};

/** An `optionOrder` entry as it arrives — `optionOrder[]{_ref}` or `optionOrder[]._ref`. */
export type OptionOrderEntry = string | { _ref?: string | null } | null | undefined;

function refOf(entry: OptionOrderEntry): string | null {
  if (typeof entry === 'string') return entry || null;
  const ref = entry?._ref;
  return typeof ref === 'string' && ref !== '' ? ref : null;
}

function byTitle(a: OrderableOption, b: OrderableOption): number {
  const at = a.title?.trim() || a._id;
  const bt = b.title?.trim() || b._id;
  return at.localeCompare(bt);
}

/**
 * Pinned options in drag order, then every other option alphabetically.
 *
 * `optionOrder` absent, empty, or naming only options not in `options` all collapse
 * to plain alphabetical — which is the behaviour a type has before anyone pins
 * anything, and the reason this is safe to ship before any consumer reads it.
 *
 * Input order is never trusted: the tail is sorted here rather than assumed, because
 * the real consumer receives its options in the order they arrive from one flat
 * library query (see below).
 */
export function orderOptionsInType<T extends OrderableOption>(
  options: readonly T[],
  optionOrder: readonly OptionOrderEntry[] | null | undefined,
): T[] {
  const byId = new Map<string, T>();
  for (const option of options) {
    if (option?._id) byId.set(option._id, option);
  }

  const pinned: T[] = [];
  const pinnedIds = new Set<string>();
  for (const entry of optionOrder ?? []) {
    const ref = refOf(entry);
    if (!ref || pinnedIds.has(ref)) continue;
    const option = byId.get(ref);
    // No match = a weak reference to an option that has been deleted, or one the
    // caller did not pass. Either way it is not ours to render.
    if (!option) continue;
    pinned.push(option);
    pinnedIds.add(ref);
  }

  const rest = [...byId.values()].filter((option) => !pinnedIds.has(option._id));
  rest.sort(byTitle);

  return [...pinned, ...rest];
}

/**
 * Wired in `buildStepsFromCatalog` (apps/www/src/lib/customization-builder/state.ts)
 * for PROD-2775 — each type bucket's options are reordered with this helper using
 * that type's `optionOrder` (projected as `typeOptionOrder` on catalog options).
 *
 * Options are never fetched per type. CATALOG_CUSTOMIZATION_LIBRARY_QUERY and the
 * product offer return flat lists; the builder buckets by type in JavaScript, then
 * calls this so pinned options lead and the rest sort alphabetically.
 *
 * The twin `orderTypesInCategory` orders TYPES in the same rail (PROD-2740 / PROD-2746).
 */
