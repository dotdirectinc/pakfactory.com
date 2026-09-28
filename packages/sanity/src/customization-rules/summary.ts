/**
 * The whole rule set at once, in a shape a person can read (PROD-2560).
 *
 * The other modules answer "what does THIS product offer". Admin also has to answer "what do
 * the rules say" — per type, per option, and where they look wrong — without a product in
 * mind. That is this file, and it is only a composition of the others: every answer here is
 * the one `resolveForProduct` gives, counted across the products the caller passes. It adds
 * no rule of its own, so it cannot disagree with Studio or the storefront.
 *
 * Computed on read, never stored (2026-09-25). A stored summary is a second copy of the rules,
 * and the second copy is the one that goes stale.
 *
 * Structured, not worded. "Works with all Paperboard except Kraft" is copy, and copy belongs
 * to the screen that shows it; this returns the parts (`coverage`, `missing`) the sentence is
 * built from.
 */
import { buildCompatibilityIndex, eligibleOptions } from './index';
import type { CompatibilityIndex, CustomizationOptionDoc, ProductDoc } from './index';
import { buildDependencyGraph } from './dependencies';
import type {
  CatalogWithDependencies,
  CustomizationTypeWithDependencies,
  DependencyGraphResult,
} from './dependencies';
import { resolveForProduct } from './resolve';
import type { ExceptionOutcome } from './resolve';

export interface SummaryCategory {
  _id: string;
  title?: string;
}

export interface SummaryOption extends CustomizationOptionDoc {
  /**
   * `customizationOption.configuratorRole`. A `reference` option is information, not a
   * choice, so a pair naming one is reported (the Studio field warns on the same thing).
   */
  configuratorRole?: 'configurable' | 'reference';
}

export interface SummaryProduct extends ProductDoc {
  title?: string;
}

export interface SummaryCatalog extends CatalogWithDependencies {
  types: CustomizationTypeWithDependencies[];
  options: SummaryOption[];
  /** For naming a requirement's category entries. Optional: without it they stay ids. */
  categories?: SummaryCategory[];
}

export interface SummaryInput {
  catalog: SummaryCatalog;
  /**
   * The products to count reach across. STANDARD products only: a preset answers with its
   * `basedOn` product (the storefront and Studio both do this), so passing presets as well
   * would count their base twice.
   */
  products: SummaryProduct[];
}

/** One entry of a requirement, as the editor wrote it. */
export interface RequirementEntry {
  kind: 'category' | 'type' | 'unknown';
  id: string;
}

export interface TypeSummary {
  typeId: string;
  decidedBy: 'product' | 'customization';
  categoryId?: string;
  customerSelects: 'one' | 'many';
  /**
   * `dependsOn` as written: every requirement must be met, any entry within one is enough.
   * "(Materials) AND (Ink)", "(Lamination OR Surface Finish)". Empty on a product-decided type.
   */
  requirements: RequirementEntry[][];
  /** The same requirements expanded to type ids — what the rules actually check. */
  groups: string[][];
  /**
   * `product` — the product lists them. `constrained` — requirements narrow it.
   * `unconstrained` — customization-decided with no requirement, so nothing narrows it and
   * every eligible option is offered wherever the type appears. `resolves-to-nothing` — it
   * states requirements that expand to no type, which reads like an answer and is not one.
   */
  state: 'product' | 'constrained' | 'unconstrained' | 'resolves-to-nothing';
  optionCount: number;
  /**
   * Products offering at least one option of this type, once the rules settle. There is no
   * "emptied" count beside it on purpose: a customization-decided type starts from every
   * eligible option on every product, so across the catalog "emptied" is just "not offered".
   * The per-product `emptiedTypes` stays with `resolveForProduct`, where it means something.
   */
  productsOffering: number;
}

export interface PartnerGroup {
  /** The partner type. */
  typeId: string;
  /**
   * How the two types relate:
   * `requirement` — the partner type is one this option's type depends on (it decides this).
   * `dependent`   — the partner's type depends on this option's type (this decides it).
   * `other`       — no dependency either way: the pair only says "can be ordered together".
   */
  relation: 'requirement' | 'dependent' | 'other';
  partnerIds: string[];
  /** Options in the partner type, for the "all / all but" reading. */
  typeSize: number;
  /**
   * `all` — pairs with every option of the type. `all-but` — with more than half, and
   * `missing` names the rest. `some` — with half or fewer; `partnerIds` is the short list.
   */
  coverage: 'all' | 'all-but' | 'some';
  /** Set when `coverage` is `all-but`. */
  missing?: string[];
}

export interface OptionSummary {
  optionId: string;
  typeId: string;
  /** Partners grouped by type, requirement types first, then in catalog order. */
  partners: PartnerGroup[];
  /**
   * `offered` — on at least one product. `offered-nowhere` — could appear, but no product
   * ends up with it. `compatible-with-nothing` — customization-decided and paired with
   * nothing, so it never appears (empty fails closed). `unknown-type` — names no type.
   */
  status: 'offered' | 'offered-nowhere' | 'compatible-with-nothing' | 'unknown-type';
  /** Products offering it once the rules settle, exceptions included. */
  productCount: number;
  /** Of those, the products that have it only because of an `add` exception. */
  addedByException: number;
  /** Products whose `remove` exception takes it away. */
  removedByException: number;
  /**
   * Indexes into its type's `groups` where it has no partner in the whole catalog, so no
   * product can ever meet that requirement for it. The board's "not drawn in every frame".
   */
  unpairedRequirements: number[];
}

export interface ProductSummary {
  productId: string;
  /** Options offered once the rules settle, across every type. */
  optionCount: number;
  /** Of those, options of customization-decided types — the derived ones. */
  derivedCount: number;
  exceptionCount: number;
}

export interface ProductException extends ExceptionOutcome {
  productId: string;
}

export interface RulesSummary {
  types: TypeSummary[];
  options: OptionSummary[];
  products: ProductSummary[];
  /**
   * Every exception on every product and what it did. The non-effective ones
   * (`redundant`, `conflict`, `product-decided`, `unknown-option`) are the ones to fix.
   */
  exceptions: ProductException[];
  diagnostics: {
    /** `${optionId} → ${missingId}`: a reference to an option that is not in the catalog. */
    danglingReferences: string[];
    selfReferences: string[];
    /** Options naming a type that is not in the catalog. */
    unknownType: string[];
    /** `dependsOn` entries naming neither a type nor a category. */
    unknownDependencyReferences: string[];
    /** Types stating requirements the product decides anyway — inert. */
    ignoredOnProductDecided: string[];
    /** Pairs between two options of the same pick-one type: the customer can never order both. */
    siblingPairs: [string, string][];
    /** Pairs where either side is a `reference` option, which is not a choice. */
    referencePairs: [string, string][];
  };
  totals: {
    products: number;
    types: number;
    options: number;
    /** Distinct option ↔ option pairs, counted once. */
    pairs: number;
    exceptions: number;
  };
}

const EMPTY_SET: ReadonlySet<string> = new Set();

export function summarizeRules(input: SummaryInput, index?: CompatibilityIndex): RulesSummary {
  const { catalog, products } = input;
  const compatibility = index ?? buildCompatibilityIndex(catalog.options);
  const graph: DependencyGraphResult = buildDependencyGraph(catalog);
  const { compatibleWithNothing, unknownType } = eligibleOptions(catalog, compatibility);

  const typeById = new Map(catalog.types.map((t) => [t._id, t]));
  const typeIds = new Set(typeById.keys());
  const categoryIds = new Set((catalog.categories ?? []).map((c) => c._id));
  for (const t of catalog.types) if (t.categoryId) categoryIds.add(t.categoryId);
  const typeOrder = new Map(catalog.types.map((t, i) => [t._id, i]));
  const optionTypeOf = new Map(catalog.options.map((o) => [o._id, o.typeId]));
  const optionsOfType = new Map<string, string[]>();
  for (const option of catalog.options) {
    const list = optionsOfType.get(option.typeId) ?? [];
    list.push(option._id);
    optionsOfType.set(option.typeId, list);
  }
  const groupsOf = (typeId: string) =>
    (graph.groups[typeId] ?? []).map((g) => g.filter((d) => typeIds.has(d))).filter((g) => g.length > 0);

  // Resolve every product once; every per-type and per-option count below reads these.
  const productCount = new Map<string, number>();
  const addedCount = new Map<string, number>();
  const removedCount = new Map<string, number>();
  const typeOffering = new Map<string, number>();
  const productSummaries: ProductSummary[] = [];
  const exceptions: ProductException[] = [];
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const product of products) {
    const r = resolveForProduct(catalog, product, graph, compatibility);
    let optionCount = 0;
    let derivedCount = 0;
    for (const [typeId, ids] of r.availableByType) {
      bump(typeOffering, typeId);
      optionCount += ids.length;
      if (typeById.get(typeId)?.availabilityDecidedBy === 'customization') derivedCount += ids.length;
      for (const id of ids) bump(productCount, id);
    }
    for (const e of r.exceptions) {
      exceptions.push({ productId: product._id, ...e });
      if (e.effect === 'added') bump(addedCount, e.optionId);
      if (e.effect === 'removed') bump(removedCount, e.optionId);
    }
    productSummaries.push({
      productId: product._id,
      optionCount,
      derivedCount,
      exceptionCount: r.exceptions.length,
    });
  }

  const ignored = new Set(graph.ignoredOnProductDecided);
  const resolvedToNothing = new Set(graph.resolvedToNothing);
  const types: TypeSummary[] = catalog.types.map((type) => {
    const decidedBy = type.availabilityDecidedBy;
    const written = decidedBy === 'customization'
      ? type.requirements ?? (type.dependsOn ?? []).map((ref) => [ref])
      : [];
    const requirements = written.map((req) =>
      req.map((id): RequirementEntry => ({
        kind: typeIds.has(id) ? 'type' : categoryIds.has(id) ? 'category' : 'unknown',
        id,
      })),
    );
    const groups = groupsOf(type._id);
    const state: TypeSummary['state'] =
      decidedBy === 'product' ? 'product'
      : resolvedToNothing.has(type._id) ? 'resolves-to-nothing'
      : groups.length === 0 ? 'unconstrained'
      : 'constrained';
    return {
      typeId: type._id,
      decidedBy,
      ...(type.categoryId ? { categoryId: type.categoryId } : {}),
      customerSelects: type.customerSelects ?? 'one',
      requirements,
      groups,
      state,
      optionCount: optionsOfType.get(type._id)?.length ?? 0,
      productsOffering: typeOffering.get(type._id) ?? 0,
    };
  });

  const nothing = new Set(compatibleWithNothing);
  const noType = new Set(unknownType);
  const options: OptionSummary[] = catalog.options.map((option) => {
    const pairs = compatibility.pairs.get(option._id) ?? EMPTY_SET;
    const ownGroups = groupsOf(option.typeId);
    const requirementTypes = new Set(ownGroups.flat());

    const byType = new Map<string, string[]>();
    for (const partner of pairs) {
      const t = optionTypeOf.get(partner);
      if (t === undefined) continue;
      const list = byType.get(t) ?? [];
      list.push(partner);
      byType.set(t, list);
    }
    const partners: PartnerGroup[] = [...byType]
      .map(([typeId, ids]) => {
        const all = optionsOfType.get(typeId) ?? [];
        const have = new Set(ids);
        const partnerIds = all.filter((id) => have.has(id));
        const missing = all.filter((id) => !have.has(id));
        const coverage: PartnerGroup['coverage'] =
          missing.length === 0 ? 'all' : partnerIds.length > missing.length ? 'all-but' : 'some';
        const relation: PartnerGroup['relation'] = requirementTypes.has(typeId)
          ? 'requirement'
          : groupsOf(typeId).some((g) => g.includes(option.typeId))
            ? 'dependent'
            : 'other';
        return {
          typeId,
          relation,
          partnerIds,
          typeSize: all.length,
          coverage,
          ...(coverage === 'all-but' ? { missing } : {}),
        };
      })
      .sort((a, b) =>
        Number(b.relation === 'requirement') - Number(a.relation === 'requirement') ||
        (typeOrder.get(a.typeId) ?? 0) - (typeOrder.get(b.typeId) ?? 0),
      );

    const unpairedRequirements = ownGroups.flatMap((group, i) =>
      group.some((t) => (byType.get(t)?.length ?? 0) > 0) ? [] : [i],
    );

    const count = productCount.get(option._id) ?? 0;
    const status: OptionSummary['status'] =
      noType.has(option._id) ? 'unknown-type'
      : nothing.has(option._id) && count === 0 ? 'compatible-with-nothing'
      : count > 0 ? 'offered'
      : 'offered-nowhere';

    return {
      optionId: option._id,
      typeId: option.typeId,
      partners,
      status,
      productCount: count,
      addedByException: addedCount.get(option._id) ?? 0,
      removedByException: removedCount.get(option._id) ?? 0,
      unpairedRequirements,
    };
  });

  // Each pair once, lower id first, so the lists are stable across runs.
  const role = new Map(catalog.options.map((o) => [o._id, o.configuratorRole]));
  const siblingPairs: [string, string][] = [];
  const referencePairs: [string, string][] = [];
  let pairTotal = 0;
  for (const [a, set] of compatibility.pairs) {
    for (const b of set) {
      if (a >= b) continue;
      pairTotal++;
      const ta = optionTypeOf.get(a);
      if (ta !== undefined && ta === optionTypeOf.get(b) && (typeById.get(ta)?.customerSelects ?? 'one') === 'one') {
        siblingPairs.push([a, b]);
      }
      if (role.get(a) === 'reference' || role.get(b) === 'reference') referencePairs.push([a, b]);
    }
  }
  const byPair = (x: [string, string], y: [string, string]) => x[0].localeCompare(y[0]) || x[1].localeCompare(y[1]);

  return {
    types,
    options,
    products: productSummaries,
    exceptions,
    diagnostics: {
      danglingReferences: compatibility.dangling,
      selfReferences: compatibility.selfReferences,
      unknownType,
      unknownDependencyReferences: graph.unknownReferences,
      ignoredOnProductDecided: [...ignored],
      siblingPairs: siblingPairs.sort(byPair),
      referencePairs: referencePairs.sort(byPair),
    },
    totals: {
      products: products.length,
      types: catalog.types.length,
      options: catalog.options.length,
      pairs: pairTotal,
      exceptions: exceptions.length,
    },
  };
}
