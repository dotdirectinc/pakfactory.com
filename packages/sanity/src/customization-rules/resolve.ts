/**
 * What one product can actually offer, once the rules have settled (PROD-2557).
 *
 * `offersForProduct` answers the easy half — the types the PRODUCT decides. This
 * file answers the other half: a type decided by another customization offers
 * only what the material or process it goes on allows, and removing one option
 * can remove the option that depended on it, and so on. So it is a fixpoint, not
 * a single pass:
 *
 *   Colour System works on Offset · Offset works on Paperboard · the product
 *   offers no Paperboard → Offset goes → the Colour System option that only
 *   paired with Offset goes one pass later.
 *
 * ALL-OF ACROSS DEPENDENCIES, ANY-OF WITHIN ONE. If a type depends on both
 * Material and Surface Finish, an option must find a partner in BOTH to survive;
 * within Material, any one compatible material is enough. That grouping is what
 * the board draws as separate frames, and collapsing it to a single "any pair
 * anywhere" is the mistake that keeps an option alive on the strength of a
 * relationship from a different axis entirely.
 */
import { buildCompatibilityIndex, eligibleOptions, offersForProduct } from './index';
import type { Catalog, CompatibilityIndex, ProductDoc } from './index';

/**
 * Which types decide which. `dependsOn[T]` lists the types whose options gate T.
 *
 * Passed in rather than read, because `compatibleCustomizations` is symmetric and
 * cannot say which side restricts which. Its production source is
 * `customizationType.dependsOn` (PROD-2558); until that exists a caller states it
 * explicitly, and the rules never infer it.
 */
export interface DependencyGraph {
  dependsOn: Record<string, string[]>;
}

export interface RemovedOption {
  optionId: string;
  typeId: string;
  /** The dependency types it could not find a single partner in. */
  unsatisfied: string[];
}

export interface Resolution {
  /** type id → option ids still standing, in catalog order. */
  availableByType: Map<string, string[]>;
  removed: RemovedOption[];
  /**
   * Customization-decided types with no dependency declared. Nothing constrains
   * them, so every eligible option survives — which is the one place this file
   * does NOT fail closed, and therefore the one worth showing. It disappears
   * once `dependsOn` is populated.
   */
  unconstrainedTypes: string[];
  /** Dependencies naming a type that is not in the catalog. Ignored. */
  unknownDependencies: string[];
  /** Passes taken to settle. 1 means nothing cascaded. */
  iterations: number;
}

export function resolveForProduct(
  catalog: Catalog,
  product: ProductDoc,
  graph: DependencyGraph,
  index?: CompatibilityIndex,
): Resolution {
  const compatibility = index ?? buildCompatibilityIndex(catalog.options);
  const { eligible } = eligibleOptions(catalog, compatibility);
  const { offers } = offersForProduct(catalog, product);

  const typeById = new Map(catalog.types.map((t) => [t._id, t]));
  const optionsOfType = new Map<string, string[]>();
  for (const option of catalog.options) {
    const list = optionsOfType.get(option.typeId) ?? [];
    list.push(option._id);
    optionsOfType.set(option.typeId, list);
  }

  // Seed. A product-decided type starts at what the product lists; a
  // customization-decided type starts at everything that could ever appear, and
  // the loop below takes away.
  const available = new Map<string, Set<string>>();
  for (const type of catalog.types) {
    if (type.availabilityDecidedBy === 'product') {
      const offered = offers.find((o) => o.type._id === type._id);
      available.set(type._id, new Set(offered?.optionIds ?? []));
    } else {
      available.set(
        type._id,
        new Set((optionsOfType.get(type._id) ?? []).filter((id) => eligible.has(id))),
      );
    }
  }

  const unconstrainedTypes: string[] = [];
  const unknownDependencies = new Set<string>();
  for (const type of catalog.types) {
    if (type.availabilityDecidedBy !== 'customization') continue;
    const deps = (graph.dependsOn[type._id] ?? []).filter((d) => {
      if (typeById.has(d)) return true;
      unknownDependencies.add(d);
      return false;
    });
    if (deps.length === 0) unconstrainedTypes.push(type._id);
  }

  const removedBy = new Map<string, string[]>();
  let iterations = 0;
  // Each pass can only remove, and there are finitely many options, so this
  // terminates even if the graph has a cycle (A gates B gates A).
  const ceiling = catalog.options.length + 1;
  for (;;) {
    iterations++;
    let changed = false;
    for (const type of catalog.types) {
      if (type.availabilityDecidedBy !== 'customization') continue;
      const deps = (graph.dependsOn[type._id] ?? []).filter((d) => typeById.has(d));
      if (deps.length === 0) continue;
      const set = available.get(type._id)!;
      for (const optionId of [...set]) {
        const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
        const unsatisfied = deps.filter((dep) => {
          const live = available.get(dep) ?? new Set<string>();
          for (const candidate of live) if (partners.has(candidate)) return false;
          return true;
        });
        if (unsatisfied.length > 0) {
          set.delete(optionId);
          removedBy.set(optionId, unsatisfied);
          changed = true;
        }
      }
    }
    if (!changed || iterations >= ceiling) break;
  }

  const order = new Map(catalog.options.map((o, i) => [o._id, i]));
  const availableByType = new Map<string, string[]>();
  for (const [typeId, set] of available) {
    if (set.size === 0) continue;
    availableByType.set(
      typeId,
      [...set].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
    );
  }

  const optionType = new Map(catalog.options.map((o) => [o._id, o.typeId]));
  const removed: RemovedOption[] = [...removedBy]
    .map(([optionId, unsatisfied]) => ({
      optionId,
      typeId: optionType.get(optionId) ?? '',
      unsatisfied,
    }))
    .sort((a, b) => (order.get(a.optionId) ?? 0) - (order.get(b.optionId) ?? 0));

  return {
    availableByType,
    removed,
    unconstrainedTypes,
    unknownDependencies: [...unknownDependencies],
    iterations,
  };
}
