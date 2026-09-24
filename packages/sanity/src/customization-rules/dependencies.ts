/**
 * `customizationType.dependsOn` → the graph the rules take (PROD-2558, PROD-2557).
 *
 * The Studio field holds what an editor can sensibly author: a reference to a whole CATEGORY
 * when anything in it decides ("Material dictates Printing Method" — all sixteen material
 * types, and naming them one by one would be wrong the day a seventeenth arrives), or to a
 * TYPE when only some do ("Colour System depends on Printing Method").
 *
 * The rules take neither. They take type ids, because that is what an option belongs to. This
 * is the one place that knows both, so the expansion lives here rather than in each caller.
 *
 * The return value is deliberately structural rather than typed against `resolve.ts`: the two
 * land separately, and a shape is a cheaper dependency than an import.
 */
import type { Catalog, CustomizationTypeDoc } from './types';

export interface DependencyGraphResult {
  /** type id → the type ids whose options gate it, flattened. For reporting. */
  dependsOn: Record<string, string[]>;
  /**
   * type id → one group per `dependsOn` entry: a type reference is a group of one, a
   * category reference is the group of its member types. The rules need a partner in EVERY
   * group and in ANY member of one. Pass it to `resolveForProduct` with `dependsOn` —
   * without it each category member becomes its own requirement, which no product can meet.
   */
  groups: Record<string, string[][]>;
  /** References that name neither a type nor a category in the catalog. Ignored. */
  unknownReferences: string[];
  /**
   * Types that list dependencies but say the PRODUCT decides them. Inert rather than wrong —
   * the product's own list governs — so the entry is ignored and named, matching the warning
   * the Studio field shows for the same state.
   */
  ignoredOnProductDecided: string[];
  /**
   * Types that state a dependency which expands to nothing — a category whose only member is
   * the type itself, or references that all resolved away. Reported because it reads like an
   * answer and is not one: the rules would treat the type as unconstrained.
   */
  resolvedToNothing: string[];
}

export interface CustomizationTypeWithDependencies extends CustomizationTypeDoc {
  /** The category this type belongs to. */
  categoryId?: string;
  /**
   * `customizationType.dependsOn` as REQUIREMENTS (PROD-2595): each inner list is one
   * requirement, met by a partner in ANY of its entries; every requirement must be met.
   * Entries are customizationCategory or customizationType ids.
   */
  requirements?: string[][];
  /**
   * The old flat shape: each reference its own requirement. Read only when `requirements` is
   * absent — hand-stated catalogs and data not yet migrated.
   */
  dependsOn?: string[];
}

export interface CatalogWithDependencies extends Catalog {
  types: CustomizationTypeWithDependencies[];
}

export function buildDependencyGraph(catalog: CatalogWithDependencies): DependencyGraphResult {
  const typeIds = new Set(catalog.types.map((t) => t._id));
  const typesByCategory = new Map<string, string[]>();
  for (const type of catalog.types) {
    if (!type.categoryId) continue;
    const list = typesByCategory.get(type.categoryId) ?? [];
    list.push(type._id);
    typesByCategory.set(type.categoryId, list);
  }

  const dependsOn: Record<string, string[]> = {};
  const groups: Record<string, string[][]> = {};
  const unknownReferences: string[] = [];
  const ignoredOnProductDecided: string[] = [];
  const resolvedToNothing: string[] = [];

  for (const type of catalog.types) {
    const requirements = type.requirements ?? (type.dependsOn ?? []).map((ref) => [ref]);
    if (requirements.length === 0) continue;
    if (type.availabilityDecidedBy !== 'customization') {
      ignoredOnProductDecided.push(type._id);
      continue;
    }

    // Each requirement becomes ONE group: its entries expand (a type to itself, a category to
    // its member types) and merge, because any of them is enough. Naming your OWN category is
    // meaningful — your siblings gate you — so it expands like any other; only the type itself
    // drops out. A requirement that expands to nothing is dropped, and a type left with none is
    // the degenerate case reported below.
    const resolved = new Set<string>();
    const typeGroups: string[][] = [];
    const seen = new Set<string>();
    for (const requirement of requirements) {
      const group = new Set<string>();
      for (const ref of requirement) {
        if (typeIds.has(ref)) {
          // A type depending on itself says nothing. The Studio field rejects it; a stale
          // document could still carry one.
          if (ref !== type._id) group.add(ref);
          continue;
        }
        const members = typesByCategory.get(ref);
        if (!members) {
          unknownReferences.push(ref);
          continue;
        }
        for (const member of members) if (member !== type._id) group.add(member);
      }
      const sorted = [...group].sort();
      const signature = sorted.join('|');
      if (sorted.length === 0 || seen.has(signature)) continue;
      seen.add(signature);
      for (const member of sorted) resolved.add(member);
      typeGroups.push(sorted);
    }

    if (resolved.size === 0) {
      resolvedToNothing.push(type._id);
      continue;
    }
    dependsOn[type._id] = [...resolved].sort();
    groups[type._id] = typeGroups;
  }

  return { dependsOn, groups, unknownReferences, ignoredOnProductDecided, resolvedToNothing };
}
