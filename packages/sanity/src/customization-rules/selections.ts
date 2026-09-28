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
 *
 * PICKS ALSO CHECK EACH OTHER, PAIR BY PAIR (PROD-2556). `compatibleCustomizations` is complete
 * for every two options a product can offer together: the fill asked the registry's engine —
 * Crystal's exclude rules included — whether each survives the other on every product offering
 * both. So once an option is picked, anything it is NOT paired with cannot be ordered alongside
 * it, whatever types the two belong to and whether or not either depends on the other:
 *
 *   Soy-Based Ink hides the other By Composition inks (same type — Ink is `customerSelects:
 *   many`), Soft Touch hides every Debossing option, a Debossing option hides Soft Touch, and a
 *   finish picked first hides the boards it does not work on.
 *
 * Requirements (`dependsOn`) alone never saw these: they read pairs only between a type and the
 * types it depends on. Two exemptions keep the pairwise read honest:
 *
 *   - A `one` type's own alternatives are never hidden by its pick. Only one is ordered, so they
 *     are never paired (the fill leaves them out) — and the customer must be able to switch.
 *   - An option with NO pairs at all is left out of the check on both sides. Empty means
 *     "nothing recorded" (an Add exception, a hand-made option), not "clashes with everything".
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
  /**
   * Earlier picks it is not compatible with. Only set when two picks clash — which a
   * configurator that hides clashing options only meets in seeded or saved state.
   */
  conflictsWith?: string[];
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

export interface SelectionOptions {
  /**
   * List only what can actually be picked (PROD-2556). Each candidate is tried: added to the
   * selections (a `one` type's pick swapped for it), and kept only if nothing — neither it nor
   * an earlier pick — is invalidated. Without it an option can be listed that no board works
   * with once combined with the other picks, and picking it clears choices the customer made.
   * A configurator wants this; a report of what the rules say does not.
   */
  lookahead?: boolean;
}

export function resolveWithSelections(
  catalog: Catalog,
  product: ProductDoc,
  graph: DependencyGraph,
  selections: Selections,
  index?: CompatibilityIndex,
  options: SelectionOptions = {},
): SelectionResolution {
  const compatibility = index ?? buildCompatibilityIndex(catalog.options);

  // What the product could offer before anyone chose anything. A selection can only ever
  // narrow this, never add to it.
  const base = resolveForProduct(catalog, product, graph, compatibility);
  const result = narrow(catalog, graph, compatibility, base, selections);
  if (!options.lookahead) return { ...base, ...result };

  const selectsMany = new Set(catalog.types.filter((t) => t.customerSelects === 'many').map((t) => t._id));
  const pickable = new Map<string, string[]>();
  for (const [typeId, ids] of result.availableByType) {
    const picked = new Set(result.selections[typeId] ?? []);
    const keep = ids.filter((optionId) => {
      if (picked.has(optionId)) return true;
      const trial: Selections = { ...result.selections };
      trial[typeId] = selectsMany.has(typeId) ? [...(trial[typeId] ?? []), optionId] : [optionId];
      return narrow(catalog, graph, compatibility, base, trial).invalidated.length === 0;
    });
    if (keep.length > 0) pickable.set(typeId, keep);
  }
  return { ...base, ...result, availableByType: pickable };
}

function narrow(
  catalog: Catalog,
  graph: DependencyGraph,
  compatibility: CompatibilityIndex,
  base: Resolution,
  selections: Selections,
) {
  const optionType = new Map(catalog.options.map((o) => [o._id, o.typeId]));

  const notOffered: InvalidatedSelection[] = [];
  const kept: Selections = {};
  for (const [typeId, chosen] of Object.entries(selections)) {
    const offered = new Set(base.availableByType.get(typeId) ?? []);
    for (const optionId of chosen) {
      if (offered.has(optionId)) (kept[typeId] ??= []).push(optionId);
      else notOffered.push({ typeId: optionType.get(optionId) ?? typeId, optionId, unsatisfied: [] });
    }
  }

  // Pairwise: two options clash when both have pairs recorded and neither names the other.
  // A `one` type's alternatives never clash with its pick (see the header).
  const selectsMany = new Set(catalog.types.filter((t) => t.customerSelects === 'many').map((t) => t._id));
  const hasPairs = (id: string) => (compatibility.pairs.get(id)?.size ?? 0) > 0;
  const clash = (a: { typeId: string; optionId: string }, b: { typeId: string; optionId: string }) =>
    a.optionId !== b.optionId &&
    !(a.typeId === b.typeId && !selectsMany.has(a.typeId)) &&
    hasPairs(a.optionId) &&
    hasPairs(b.optionId) &&
    !compatibility.pairs.get(a.optionId)!.has(b.optionId);

  // Picks are taken in the order given; one that clashes with an earlier accepted pick is not
  // accepted. The earlier choice stands — the later one is what the customer could not have made.
  const accepted: { typeId: string; optionId: string }[] = [];
  const conflicts = new Map<string, string[]>();
  for (const [typeId, ids] of Object.entries(kept)) {
    for (const optionId of ids) {
      const pick = { typeId, optionId };
      const against = accepted.filter((a) => clash(a, pick)).map((a) => a.optionId);
      if (against.length > 0) conflicts.set(optionId, against);
      else accepted.push(pick);
    }
  }
  const acceptedByType: Selections = {};
  for (const { typeId, optionId } of accepted) (acceptedByType[typeId] ??= []).push(optionId);
  const clears = (typeId: string, optionId: string) =>
    !accepted.some((p) => clash(p, { typeId, optionId }));
  const allowed = (typeId: string) => (base.availableByType.get(typeId) ?? []).filter((id) => clears(typeId, id));

  // Narrow each chosen type to its selection, drop whatever a pick does not pair with, then let
  // the same rule settle: an option needs a partner in EVERY dependency, and a dependency that
  // has been answered offers only its answer. Removing an option can remove whatever depended
  // on it, so this repeats until nothing moves.
  //
  // `effective` is what the rules GATE on. It is not what a configurator renders: a type the
  // customer has already answered must still show its other valid options, or they can never
  // change their mind.
  const effective = new Map<string, Set<string>>();
  for (const typeId of base.availableByType.keys()) effective.set(typeId, new Set(allowed(typeId)));
  for (const [typeId, ids] of Object.entries(acceptedByType)) effective.set(typeId, new Set(ids));

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
      if (set.size === 0 && acceptedByType[type._id]) {
        effective.set(type._id, new Set(allowed(type._id)));
        changed = true;
      }
    }
    if (!changed || iterations >= ceiling) break;
  }

  // What a configurator renders: everything the product could offer that still has a partner
  // in each dependency's effective set and clashes with no pick. A `one` type's own selection
  // does not narrow its own list; a `many` type's picks hide what they do not pair with.
  const reported = new Map<string, Set<string>>();
  for (const [typeId, ids] of base.availableByType) {
    const groups = dependencyGroups(graph, typeId, (d) => effective.has(d));
    const survivors = ids.filter((optionId) => {
      if (!clears(typeId, optionId)) return false;
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
      const against = conflicts.get(optionId);
      if (!against && reported.get(typeId)?.has(optionId)) {
        (selectionsOut[typeId] ??= []).push(optionId);
        continue;
      }
      const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
      const unsatisfied = groups.filter((group) => !pairsInto(partners, group, effective)).flat();
      invalidated.push({ typeId, optionId, unsatisfied, ...(against ? { conflictsWith: against } : {}) });
    }
  }

  const order = new Map(catalog.options.map((o, i) => [o._id, i]));
  const availableByType = new Map<string, string[]>();
  for (const [typeId, set] of reported) {
    if (set.size === 0) continue;
    availableByType.set(typeId, [...set].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
  }

  return {
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
