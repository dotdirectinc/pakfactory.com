import { resolveForProduct } from "@pakfactory/sanity/customization-rules/resolve";
import { resolveProductDims } from "@pakfactory/sanity/resolve-product-dims";
import { dimensionAxesFor } from "@pakfactory/utilities/dimension-axes";
import { convertDimensionRangeToUnit } from "@pakfactory/utilities/length-units";
import type { UiDescriptor } from "@pakfactory/ui/components/customization/types";
import type { RulesSource, SourceProduct } from "./rules-source";
import { studioEditUrl } from "./studio-link";

/**
 * One product, as the rules see it (PROD-2614): what it offers, why each derived option is
 * there, what the rules took away and why, and what its exceptions did. Everything here is
 * `resolveForProduct`'s answer — the same call the storefront makes — only named and grouped.
 */

export type ProductOptionState =
  /** A product-decided option the product lists itself. */
  | "listed"
  /** A customization-decided option the rules derive. */
  | "derived"
  /** Offered only because of an `add` exception. */
  | "added";

export type ProductOptionRow = {
  id: string;
  title: string;
  state: ProductOptionState;
  /** For a derived option: per type it depends on, the partners that keep it available. */
  because: { typeTitle: string; partners: string[] }[];
  /** Reference options are information, never a customer's pick. */
  reference: boolean;
};

export type RemovedOptionRow = {
  id: string;
  title: string;
  /** "Materials", "Ink" — the requirements it found no partner in. */
  unsatisfied: string[];
  byException: boolean;
};

export type ProductTypeBlock = {
  typeId: string;
  title: string;
  decidedBy: "product" | "customization";
  customerSelects: "one" | "many";
  /** Customization-decided with no requirement: nothing narrows it. */
  unconstrained: boolean;
  options: ProductOptionRow[];
  removed: RemovedOptionRow[];
};

export type ProductCategoryBlock = { title: string; types: ProductTypeBlock[] };

export type ProductExceptionRow = {
  optionTitle: string;
  mode: "add" | "remove";
  effect: string;
  reason?: string;
  /** For an add: why the rules left it out. */
  rulesSaid?: string;
};

/**
 * The catalog half of the browser-side configurator: the WHOLE catalog, ids shortened to tokens
 * (`ids[n]` is token `n`). The same for every product, so it is served once from
 * `/api/spec/rules-snapshot` and cached, and only loaded when "Configure as a customer" opens.
 *
 * Deliberately not pruned to a product. Pruning changes which options are eligible unless it is
 * done exactly as www does it, and a second copy of that logic is how two screens start to
 * disagree.
 */
export type CatalogSnapshot = {
  ids: string[];
  types: {
    _id: string;
    title: string;
    categoryTitle: string;
    availabilityDecidedBy: "product" | "customization";
    customerSelects?: "one" | "many";
    categoryId?: string;
    requirements?: string[][];
  }[];
  options: { _id: string; typeId: string; compatibleCustomizations: string[] }[];
  titles: Record<string, string>;
  /** Tokens of reference-role options — shown, never pickable. */
  reference: string[];
};

/** The product half, with REAL ids — the client maps them onto whatever snapshot it holds. */
export type ConfiguratorProduct = {
  _id: string;
  available: string[];
  exceptions: { optionId: string; mode: "add" | "remove"; reason?: string }[];
};

export type ProductView = {
  id: string;
  title: string;
  lineTitle?: string;
  styleTitles: string[];
  studioUrl: string | null;
  counts: { listed: number; derived: number; added: number; exceptions: number };
  categories: ProductCategoryBlock[];
  exceptions: ProductExceptionRow[];
  dimensions: UiDescriptor | null;
  configurator: ConfiguratorProduct;
};

export function findProduct(source: RulesSource, id: string): SourceProduct | undefined {
  return source.products.find((p) => p._id === id);
}

export function buildProductView(source: RulesSource, product: SourceProduct): ProductView {
  const { catalog, name } = source;
  const r = resolveForProduct(catalog, product, source.graph, source.index);

  const optionById = new Map(catalog.options.map((o) => [o._id, o]));
  const added = new Set(r.exceptions.filter((e) => e.effect === "added").map((e) => e.optionId));
  const removedByException = new Set(
    r.exceptions.filter((e) => e.effect === "removed").map((e) => e.optionId),
  );
  const removedByRules = new Map(r.removed.map((x) => [x.optionId, x.unsatisfied]));

  const counts = { listed: 0, derived: 0, added: 0, exceptions: r.exceptions.length };
  const unconstrained = new Set(r.unconstrainedTypes);

  const blocks: (ProductTypeBlock & { categoryTitle: string })[] = [];
  for (const type of catalog.types) {
    const available = r.availableByType.get(type._id) ?? [];
    const options: ProductOptionRow[] = available.map((id) => {
      const state: ProductOptionState =
        type.availabilityDecidedBy === "product" ? "listed" : added.has(id) ? "added" : "derived";
      counts[state]++;
      return {
        id,
        title: name(id),
        state,
        because: (r.derivedBecause.get(id) ?? []).map((reason) => ({
          typeTitle: name(reason.typeId),
          partners: reason.partners.map(name),
        })),
        reference: optionById.get(id)?.configuratorRole === "reference",
      };
    });
    const removed: RemovedOptionRow[] = catalog.options
      .filter((o) => o.typeId === type._id && (removedByRules.has(o._id) || removedByException.has(o._id)))
      .map((o) => ({
        id: o._id,
        title: name(o._id),
        unsatisfied: [...new Set((removedByRules.get(o._id) ?? []).map(name))],
        byException: removedByException.has(o._id),
      }));
    if (options.length === 0 && removed.length === 0) continue;
    blocks.push({
      typeId: type._id,
      title: name(type._id),
      categoryTitle: type.categoryId ? name(type.categoryId) : "Other",
      decidedBy: type.availabilityDecidedBy,
      customerSelects: type.customerSelects ?? "one",
      unconstrained: unconstrained.has(type._id),
      options,
      removed,
    });
  }

  // Product-decided categories (materials, additional) first, as the customer meets them.
  const byCategory = new Map<string, ProductTypeBlock[]>();
  const productFirst = new Map<string, boolean>();
  for (const { categoryTitle, ...block } of blocks) {
    byCategory.set(categoryTitle, [...(byCategory.get(categoryTitle) ?? []), block]);
    if (block.decidedBy === "product") productFirst.set(categoryTitle, true);
  }
  const categories = [...byCategory]
    .sort(
      ([a], [b]) =>
        Number(!productFirst.get(a)) - Number(!productFirst.get(b)) || a.localeCompare(b),
    )
    .map(([title, types]) => ({ title, types }));

  const exceptions: ProductExceptionRow[] = r.exceptions.map((e) => ({
    optionTitle: name(e.optionId),
    mode: e.mode,
    effect: e.effect,
    ...(e.reason ? { reason: e.reason } : {}),
    ...(e.rulesSaid
      ? {
          rulesSaid:
            e.rulesSaid === "no-pairs"
              ? "it is paired with nothing"
              : `no partner in ${e.rulesSaid.unsatisfied.map(name).join(", ")}`,
        }
      : {}),
  }));

  return {
    id: product._id,
    title: product.title ?? product._id,
    ...(product.lineTitle ? { lineTitle: product.lineTitle } : {}),
    styleTitles: product.styleTitles,
    studioUrl: studioEditUrl("product", product._id),
    counts,
    categories,
    exceptions,
    dimensions: dimensionsFor(product),
    configurator: {
      _id: product._id,
      available: (product.availableCustomizations ?? []).map((a) => a.optionId),
      exceptions: (product.customizationExceptions ?? []).map((e) => ({
        optionId: e.optionId,
        mode: e.mode,
        ...(e.reason ? { reason: e.reason } : {}),
      })),
    },
  };
}

function dimensionsFor(product: SourceProduct): UiDescriptor | null {
  if (!product.dimensionInput) return null;
  const { axes } = resolveProductDims(product.dimensionInput, product.dimensionRange);
  const rangeMm = (product.dimensionRange ?? undefined) as Parameters<typeof convertDimensionRangeToUnit>[0];
  return {
    kind: "dimension",
    unit: "in",
    axes: dimensionAxesFor(axes),
    ranges: convertDimensionRangeToUnit(rangeMm, "in", axes),
  } as UiDescriptor;
}

export function catalogSnapshot(source: RulesSource): CatalogSnapshot {
  const { catalog, name } = source;
  const ids = catalog.options.map((o) => o._id);
  const token = new Map(ids.map((id, n) => [id, n.toString(36)]));
  const tok = (id: string) => token.get(id) ?? id;
  const titles: Record<string, string> = {};
  for (const o of catalog.options) titles[tok(o._id)] = name(o._id);

  return {
    ids,
    types: catalog.types.map((t) => ({
      _id: t._id,
      title: name(t._id),
      categoryTitle: t.categoryId ? name(t.categoryId) : "Other",
      availabilityDecidedBy: t.availabilityDecidedBy,
      ...(t.customerSelects ? { customerSelects: t.customerSelects } : {}),
      ...(t.categoryId ? { categoryId: t.categoryId } : {}),
      ...(t.requirements ? { requirements: t.requirements } : {}),
    })),
    options: catalog.options.map((o) => ({
      _id: tok(o._id),
      typeId: o.typeId,
      compatibleCustomizations: (o.compatibleCustomizations ?? []).map(tok),
    })),
    titles,
    reference: catalog.options.filter((o) => o.configuratorRole === "reference").map((o) => tok(o._id)),
  };
}
