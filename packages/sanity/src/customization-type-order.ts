/**
 * Order the Customization Types inside a Category (PROD-2740).
 *
 * `customizationCategory.typeOrder` is a curated, PARTIAL list of type
 * references. It is order only and never a gate: a type it does not name still
 * appears, alphabetically, after the ones it does. A partial list is therefore
 * the normal state, not a half-finished one.
 *
 * This is the TS twin of the two-tier GROQ in `LINE_STYLES` (queries/catalog.ts),
 * which does the same job for `productLine.styleOrder`. It lives in TS rather
 * than GROQ because its consumer assembles the list in JavaScript — see the
 * note at the bottom of this file.
 *
 * ⚠️ The references in `typeOrder` are WEAK, so a deleted type leaves a dangling
 * entry behind rather than blocking the delete. Refs that match no type are
 * dropped here; nothing downstream has to know about them.
 */

export type OrderableType = {
  _id: string;
  title?: string | null;
};

/** A `typeOrder` entry as it arrives from GROQ — `typeOrder[]{_ref}` or `typeOrder[]._ref`. */
export type TypeOrderEntry = string | { _ref?: string | null } | null | undefined;

function refOf(entry: TypeOrderEntry): string | null {
  if (typeof entry === 'string') return entry || null;
  const ref = entry?._ref;
  return typeof ref === 'string' && ref !== '' ? ref : null;
}

function byTitle(a: OrderableType, b: OrderableType): number {
  const at = a.title?.trim() || a._id;
  const bt = b.title?.trim() || b._id;
  return at.localeCompare(bt);
}

/**
 * Listed types in drag order, then every other type alphabetically.
 *
 * `typeOrder` absent, empty, or naming only deleted types all collapse to plain
 * alphabetical — the behaviour a category has before anyone drags anything.
 *
 * Input order is never trusted: the tail is sorted here rather than assumed,
 * because the one real consumer receives its types in arbitrary order (see below).
 */
export function orderTypesInCategory<T extends OrderableType>(
  types: readonly T[],
  typeOrder: readonly TypeOrderEntry[] | null | undefined,
): T[] {
  const byId = new Map<string, T>();
  for (const type of types) {
    if (type?._id) byId.set(type._id, type);
  }

  const pinned: T[] = [];
  const pinnedIds = new Set<string>();
  for (const entry of typeOrder ?? []) {
    const ref = refOf(entry);
    if (!ref || pinnedIds.has(ref)) continue;
    const type = byId.get(ref);
    // No match = a weak reference to a type that has been deleted, or one that
    // is not in this category. Either way it is not ours to render.
    if (!type) continue;
    pinned.push(type);
    pinnedIds.add(ref);
  }

  const rest = [...byId.values()].filter((type) => !pinnedIds.has(type._id));
  rest.sort(byTitle);

  return [...pinned, ...rest];
}

/**
 * Applied by `buildStepsFromCatalog`
 * (apps/www/src/lib/customization-builder/state.ts, PROD-2746). The builder
 * buckets options by category, then calls this function with that category's
 * `typeOrder`.
 *
 * `/customizations` does not. It lists options, and category tabs use the
 * hard-coded slug order in apps/www/src/lib/catalog/customization-category-order.ts.
 * Options inside a type stay in library-query order (`title asc`) until
 * `orderOptionsInType` is called on each bucket.
 */
