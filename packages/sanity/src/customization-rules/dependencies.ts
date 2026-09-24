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
  /** References to a customizationCategory or a customizationType. */
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
    const refs = type.dependsOn ?? [];
    if (refs.length === 0) continue;
    if (type.availabilityDecidedBy !== 'customization') {
      ignoredOnProductDecided.push(type._id);
      continue;
    }

    // Naming your OWN category is meaningful — your siblings gate you — so it expands like
    // any other; only the type itself drops out. A category whose sole member is this type
    // therefore expands to nothing, which is the degenerate case reported below.
    const resolved = new Set<string>();
    const typeGroups: string[][] = [];
    for (const ref of refs) {
      if (typeIds.has(ref)) {
        // A type depending on itself says nothing. The Studio field rejects it; a stale
        // document could still carry one.
        if (ref !== type._id) {
          resolved.add(ref);
          typeGroups.push([ref]);
        }
        continue;
      }
      const members = typesByCategory.get(ref);
      if (!members) {
        unknownReferences.push(ref);
        continue;
      }
      const group = members.filter((member) => member !== type._id).sort();
      for (const member of group) resolved.add(member);
      if (group.length > 0) typeGroups.push(group);
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
