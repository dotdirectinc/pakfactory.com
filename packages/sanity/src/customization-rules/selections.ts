/**
 * What is still available once the customer has chosen something (PROD-2557).
 *
 * `resolveForProduct` answers the product-level question: everything this product could ever
 * offer. A configurator needs the next one — the customer picked Fabric, so which printing
 * methods survive? — and it needs it to be honest about the awkward case:
 *
 *   A CHOICE CAN INVALIDATE AN EARLIER CHOICE. Pick Offset, then change the material to one
 *   Offset does not work on, and the Offset selection is no longer possible. Silently dropping
 *   it produces a spec the customer never agreed to; silently keeping it produces one that
 *   cannot be made. So it is removed AND reported, and the caller decides what to say.
 *
 * A selection narrows its own type to what was chosen, and that narrowing feeds the same
 * fixpoint the product-level pass uses: choosing a material removes the finishes that needed a
 * different one, which can remove a colour system that needed one of those finishes.
 */
import { buildCompatibilityIndex } from './index';
import { dependencyGroups, resolveForProduct } from './resolve';
import type { CompatibilityIndex, Catalog, ProductDoc } from './index';
import type { DependencyGraph, Resolution } from './resolve';

/** type id → the option ids the customer has chosen for it. */
export type Selections = Record<string, string[]>;

export interface InvalidatedSelection {
  typeId: string;
  optionId: string;
  /** The dependency types it can no longer find a partner in, given the other selections. */
  unsatisfied: string[];
}

export interface SelectionResolution extends Resolution {
  /** The selections that still stand, narrowed to what is actually available. */
  selections: Selections;
  /**
   * Chosen options that another choice has made impossible. Removed from `selections` and
   * named here — the one thing a configurator must not do quietly.
   */
  invalidated: InvalidatedSelection[];
  /** Selected option ids that this product never offered at all. Ignored. */
  notOffered: InvalidatedSelection[];
}

export function resolveWithSelections(
  catalog: Catalog,
  product: ProductDoc,
  graph: DependencyGraph,
  selections: Selections,
  index?: CompatibilityIndex,
): SelectionResolution {
  const compatibility = index ?? buildCompatibilityIndex(catalog.options);
  const optionType = new Map(catalog.options.map((o) => [o._id, o.typeId]));

  // What the product could offer before anyone chose anything. A selection can only ever
  // narrow this, never add to it.
  const base = resolveForProduct(catalog, product, graph, compatibility);

  const notOffered: InvalidatedSelection[] = [];
  const kept: Selections = {};
  for (const [typeId, chosen] of Object.entries(selections)) {
    const offered = new Set(base.availableByType.get(typeId) ?? []);
    for (const optionId of chosen) {
      if (offered.has(optionId)) (kept[typeId] ??= []).push(optionId);
      else notOffered.push({ typeId: optionType.get(optionId) ?? typeId, optionId, unsatisfied: [] });
    }
  }

  // Narrow each chosen type to its selection, then let the same rule settle: an option needs
  // a partner in EVERY dependency, and a dependency that has been answered offers only its
  // answer. Removing an option can remove whatever depended on it, so this repeats until
  // nothing moves.
  //
  // `effective` is what the rules GATE on. It is not what a configurator renders: a type the
  // customer has already answered must still show its other valid options, or they can never
  // change their mind.
  const effective = new Map<string, Set<string>>();
  for (const [typeId, ids] of base.availableByType) effective.set(typeId, new Set(ids));
  for (const [typeId, ids] of Object.entries(kept)) effective.set(typeId, new Set(ids));

  const ceiling = catalog.options.length + 1;
  let iterations = 0;
  for (;;) {
    iterations++;
    let changed = false;
    for (const type of catalog.types) {
      // ALL-OF across dependency groups, ANY-OF within one (a category is one group).
      const groups = dependencyGroups(graph, type._id, (d) => effective.has(d));
      if (groups.length === 0) continue;
      const set = effective.get(type._id);
      if (!set) continue;
      for (const optionId of [...set]) {
        const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
        const gone = groups.some((group) => !pairsInto(partners, group, effective));
        if (!gone) continue;
        set.delete(optionId);
        changed = true;
      }
      // An answer that turned out to be impossible leaves the type UNANSWERED rather than
      // empty. Letting it stay empty would gate everything downstream on a choice that is
      // being discarded anyway, and report a product that offers nothing at all.
      if (set.size === 0 && kept[type._id]) {
        effective.set(type._id, new Set(base.availableByType.get(type._id) ?? []));
        changed = true;
      }
    }
    if (!changed || iterations >= ceiling) break;
  }

  // What a configurator renders: everything the product could offer that still has a partner
  // in each dependency's effective set. A type's own selection does not narrow its own list.
  const reported = new Map<string, Set<string>>();
  for (const [typeId, ids] of base.availableByType) {
    const groups = dependencyGroups(graph, typeId, (d) => effective.has(d));
    const survivors = ids.filter((optionId) => {
      const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
      return groups.every((group) => pairsInto(partners, group, effective));
    });
    if (survivors.length > 0) reported.set(typeId, new Set(survivors));
  }

  // A chosen option that did not survive is an invalidated CHOICE, not merely an unavailable
  // option: the customer had already said yes to it.
  const invalidated: InvalidatedSelection[] = [];
  const selectionsOut: Selections = {};
  for (const [typeId, ids] of Object.entries(kept)) {
    const groups = dependencyGroups(graph, typeId, (d) => effective.has(d));
    for (const optionId of ids) {
      if (reported.get(typeId)?.has(optionId)) {
        (selectionsOut[typeId] ??= []).push(optionId);
        continue;
      }
      const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
      const unsatisfied = groups.filter((group) => !pairsInto(partners, group, effective)).flat();
      invalidated.push({ typeId, optionId, unsatisfied });
    }
  }

  const order = new Map(catalog.options.map((o, i) => [o._id, i]));
  const availableByType = new Map<string, string[]>();
  for (const [typeId, set] of reported) {
    if (set.size === 0) continue;
    availableByType.set(typeId, [...set].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
  }

  return {
    ...base,
    availableByType,
    selections: selectionsOut,
    invalidated,
    notOffered,
    iterations,
  };
}

/** True when `partners` holds an option still live in ANY type of the group. */
function pairsInto(partners: ReadonlySet<string>, group: string[], live: Map<string, Set<string>>): boolean {
  for (const dep of group) for (const candidate of live.get(dep) ?? []) if (partners.has(candidate)) return true;
  return false;
}
