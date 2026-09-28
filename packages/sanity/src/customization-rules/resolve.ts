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
  /**
   * The same dependencies as GROUPS: an option needs a partner in EVERY group, and ANY member
   * of a group will do. One group per `dependsOn` entry — a type reference is a group of one;
   * a category reference is a group of its member types, because "Printing Method is decided
   * by Materials" means by the material this product has, whichever type it is. Without this
   * the category's sixteen types each became a separate requirement, and no product offers a
   * partner in every material type, so every Materials-decided type came out empty.
   *
   * `buildDependencyGraph` fills it. A graph without it (a caller stating dependencies by
   * hand) reads each `dependsOn` type as its own group.
   */
  groups?: Record<string, string[][]>;
}

/** A type's dependency groups, members limited to `keep`. Groups left empty are dropped. */
export function dependencyGroups(
  graph: DependencyGraph,
  typeId: string,
  keep: (typeId: string) => boolean,
): string[][] {
  const groups = graph.groups?.[typeId] ?? (graph.dependsOn[typeId] ?? []).map((d) => [d]);
  return groups.map((g) => g.filter(keep)).filter((g) => g.length > 0);
}

export interface EmptiedType {
  typeId: string;
  /** How many options it held before the dependencies were applied. */
  had: number;
  /** The dependency types that emptied it, in the order they were declared. */
  unsatisfied: string[];
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
  /**
   * Types that had options to offer and ended with NONE — every one removed by a dependency.
   *
   * This is the loud version of the worst failure this file can produce. `availableByType`
   * omits an empty type, which reads identically to a type that was never in the catalog, so
   * without this a product that silently offers no Embossing at all looks exactly like a
   * product with no Embossing configured. The usual cause is a dependency that should not be
   * there: a type gated by a sibling it was never drawn against has nothing to pair with, so
   * everything goes. Seeded-empty types (the product simply offers none) are NOT listed —
   * those are ordinary.
   */
  emptiedTypes: EmptiedType[];
  /** Passes taken to settle. 1 means nothing cascaded. */
  iterations: number;
  /**
   * Why each surviving customization-decided option is available: for every type it depends
   * on, the options in that type it pairs with. Empty for an option of an unconstrained type
   * (nothing narrows it) and for one pinned by an `add` exception (see `exceptions`).
   * This is the "why it is derived" the product's Customization tab shows (PROD-2595).
   */
  derivedBecause: Map<string, DerivedReason[]>;
  /** What each of the product's exceptions did, against what the rules alone would say. */
  exceptions: ExceptionOutcome[];
}

export interface DerivedReason {
  /** A type this option's type depends on. */
  typeId: string;
  /** The options still available in that type that this option pairs with. */
  partners: string[];
}

export interface ExceptionOutcome {
  optionId: string;
  typeId: string;
  mode: 'add' | 'remove';
  reason?: string;
  /**
   * `added` / `removed` — it changed the answer.
   * `redundant` — the rules already said the same; the exception does nothing.
   * `conflict` — the same option is both added and removed; both are ignored.
   * `product-decided` — the option's type is the product's to decide; use
   *   `availableCustomizations` instead. Ignored.
   * `unknown-option` — names no option in the catalog. Ignored.
   */
  effect: 'added' | 'removed' | 'redundant' | 'conflict' | 'product-decided' | 'unknown-option';
  /**
   * For an `add` the rules did not derive: why they did not. `unsatisfied` lists the types it
   * found no partner in; `no-pairs` means it has no compatible options at all. This is what a
   * reviewer checks — the rules may be recording a real impossibility.
   */
  rulesSaid?: { unsatisfied: string[] } | 'no-pairs';
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

  // Exceptions (PROD-2595). Only a customization-decided option can take one; the same option
  // both added and removed is a contradiction, so neither applies.
  const optionTypeOf = new Map(catalog.options.map((o) => [o._id, o.typeId]));
  const requested = product.customizationExceptions ?? [];
  const modesOf = new Map<string, Set<string>>();
  for (const e of requested) {
    if (!modesOf.has(e.optionId)) modesOf.set(e.optionId, new Set());
    modesOf.get(e.optionId)!.add(e.mode);
  }
  const classified = requested.map((e) => {
    const typeId = optionTypeOf.get(e.optionId);
    if (typeId === undefined || !typeById.has(typeId)) return { e, typeId: typeId ?? '', skip: 'unknown-option' as const };
    if (typeById.get(typeId)!.availabilityDecidedBy !== 'customization') return { e, typeId, skip: 'product-decided' as const };
    if (modesOf.get(e.optionId)!.size > 1) return { e, typeId, skip: 'conflict' as const };
    return { e, typeId, skip: null };
  });
  const pinned = new Set(classified.filter((c) => !c.skip && c.e.mode === 'add').map((c) => c.e.optionId));
  const excluded = new Set(classified.filter((c) => !c.skip && c.e.mode === 'remove').map((c) => c.e.optionId));

  // Seed. A product-decided type starts at what the product lists; a
  // customization-decided type starts at everything that could ever appear, and
  // the loop below takes away. A `remove` exception is taken out BEFORE the loop, so what
  // depended on it cascades out with it; an `add` is put in and pinned, so the loop never
  // takes it back and what depends on it can pair with it.
  const available = new Map<string, Set<string>>();
  for (const type of catalog.types) {
    if (type.availabilityDecidedBy === 'product') {
      const offered = offers.find((o) => o.type._id === type._id);
      available.set(type._id, new Set(offered?.optionIds ?? []));
    } else {
      const ids = (optionsOfType.get(type._id) ?? []).filter(
        (id) => (eligible.has(id) || pinned.has(id)) && !excluded.has(id),
      );
      available.set(type._id, new Set(ids));
    }
  }

  const unconstrainedTypes: string[] = [];
  const unknownDependencies = new Set<string>();
  for (const type of catalog.types) {
    if (type.availabilityDecidedBy !== 'customization') continue;
    const groups = dependencyGroups(graph, type._id, (d) => {
      if (typeById.has(d)) return true;
      unknownDependencies.add(d);
      return false;
    });
    if (groups.length === 0) unconstrainedTypes.push(type._id);
  }

  // What each type held before any dependency was applied, so a type that ends empty can be
  // told apart from one that started that way.
  const seeded = new Map<string, number>();
  for (const [typeId, set] of available) seeded.set(typeId, set.size);

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
      const groups = dependencyGroups(graph, type._id, (d) => typeById.has(d));
      if (groups.length === 0) continue;
      const set = available.get(type._id)!;
      for (const optionId of [...set]) {
        if (pinned.has(optionId)) continue;
        const partners = compatibility.pairs.get(optionId) ?? new Set<string>();
        // ALL-OF across groups, ANY-OF within one. A group with no partner anywhere reports
        // every member it looked in.
        const unsatisfied = groups
          .filter((group) =>
            !group.some((dep) => {
              for (const candidate of available.get(dep) ?? []) if (partners.has(candidate)) return true;
              return false;
            }),
          )
          .flat();
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

  const emptiedTypes: EmptiedType[] = [];
  for (const type of catalog.types) {
    const had = seeded.get(type._id) ?? 0;
    if (had === 0 || (available.get(type._id)?.size ?? 0) > 0) continue;
    const deps = dependencyGroups(graph, type._id, (d) => typeById.has(d)).flat();
    const unsatisfied = [...new Set(
      (optionsOfType.get(type._id) ?? []).flatMap((id) => removedBy.get(id) ?? []),
    )].sort((a, b) => deps.indexOf(a) - deps.indexOf(b));
    emptiedTypes.push({ typeId: type._id, had, unsatisfied });
  }

  const derivedBecause = new Map<string, DerivedReason[]>();
  for (const type of catalog.types) {
    if (type.availabilityDecidedBy !== 'customization') continue;
    const groups = dependencyGroups(graph, type._id, (d) => typeById.has(d));
    for (const optionId of availableByType.get(type._id) ?? []) {
      if (pinned.has(optionId)) {
        derivedBecause.set(optionId, []);
        continue;
      }
      const pairs = compatibility.pairs.get(optionId) ?? new Set<string>();
      // Within a category group only the member types that actually supplied a partner are
      // named — "Chipboards: Black Chipboard", not fifteen empty material types.
      derivedBecause.set(
        optionId,
        groups.flatMap((group) =>
          group
            .map((dep) => ({
              typeId: dep,
              partners: (availableByType.get(dep) ?? []).filter((p) => pairs.has(p)),
            }))
            .filter((r, _, all) => r.partners.length > 0 || all.length === 1),
        ),
      );
    }
  }

  // Each exception is judged against the rules alone, so "redundant" and "why the rules
  // said no" are answers about the model rather than about the other exceptions.
  let exceptions: ExceptionOutcome[] = [];
  if (requested.length) {
    const rulesOnly = resolveForProduct(catalog, { ...product, customizationExceptions: [] }, graph, compatibility);
    const rulesHave = (optionId: string, typeId: string) =>
      (rulesOnly.availableByType.get(typeId) ?? []).includes(optionId);
    exceptions = classified.map(({ e, typeId, skip }) => {
      const base = { optionId: e.optionId, typeId, mode: e.mode, ...(e.reason ? { reason: e.reason } : {}) };
      if (skip) return { ...base, effect: skip };
      const had = rulesHave(e.optionId, typeId);
      if (e.mode === 'remove') return { ...base, effect: had ? 'removed' : 'redundant' };
      if (had) return { ...base, effect: 'redundant' };
      const blocked = rulesOnly.removed.find((r) => r.optionId === e.optionId);
      return {
        ...base,
        effect: 'added',
        rulesSaid: blocked ? { unsatisfied: blocked.unsatisfied } : 'no-pairs',
      };
    });
  }

  return {
    availableByType,
    removed,
    unconstrainedTypes,
    unknownDependencies: [...unknownDependencies],
    emptiedTypes,
    iterations,
    derivedBecause,
    exceptions,
  };
}
