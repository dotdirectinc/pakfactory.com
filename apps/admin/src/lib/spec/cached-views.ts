import { resolveForProduct } from "@pakfactory/sanity/customization-rules/resolve";
import type { PartnerGroup, OptionSummary } from "@pakfactory/sanity/customization-rules/summary";
import { cachedSpec } from "./cache";
import { loadRulesSource, loadRulesSummary, type Loaded } from "./rules-source";
import { buildProductView, catalogSnapshot, findProduct, type CatalogSnapshot, type ProductView } from "./product-view";
import { studioEditUrl } from "./studio-link";

/**
 * The Products & Customizations views, each cached as a plain object (see `cache.ts`). A miss
 * costs one Sanity read and the package's work; a hit costs neither.
 */

export const getCatalogSnapshot = cachedSpec("catalog-snapshot", async (): Promise<Loaded<CatalogSnapshot>> => {
  const res = await loadRulesSource();
  return res.ok ? { ok: true, data: catalogSnapshot(res.data) } : res;
});

export type ProductListRow = {
  id: string;
  title: string;
  line: string;
  listed: number;
  derived: number;
  exceptions: number;
};

export const getProductRows = cachedSpec(
  "product-rows",
  async (): Promise<Loaded<{ dataset: string; rows: ProductListRow[] }>> => {
    const res = await loadRulesSummary();
    if (!res.ok) return res;
    const { source, summary } = res.data;
    const counts = new Map(summary.products.map((p) => [p.productId, p]));
    return {
      ok: true,
      data: {
        dataset: source.dataset,
        rows: source.products.map((p) => {
          const c = counts.get(p._id);
          const derived = c?.derivedCount ?? 0;
          return {
            id: p._id,
            title: p.title ?? p._id,
            line: [p.lineTitle, ...p.styleTitles].filter(Boolean).join(" · "),
            listed: (c?.optionCount ?? 0) - derived,
            derived,
            exceptions: c?.exceptionCount ?? 0,
          };
        }),
      },
    };
  },
);

/** `null` data = no standard product with this id (the page 404s). */
export const getProductView = cachedSpec(
  "product-view",
  async (id: string): Promise<Loaded<ProductView | null>> => {
    const res = await loadRulesSource();
    if (!res.ok) return res;
    const product = findProduct(res.data, id);
    return { ok: true, data: product ? buildProductView(res.data, product) : null };
  },
);

export type CustomizationView = {
  id: string;
  title: string;
  typeTitle: string;
  decidedBy?: "product" | "customization";
  status: OptionSummary["status"];
  addedByException: number;
  removedByException: number;
  studioUrl: string | null;
  partners: {
    typeId: string;
    typeTitle: string;
    relation: PartnerGroup["relation"];
    text: string;
  }[];
  offering: { id: string; title: string; lineTitle?: string }[];
};

/** `null` data = no option with this id (the page 404s). */
export const getCustomizationView = cachedSpec(
  "customization-view",
  async (id: string): Promise<Loaded<CustomizationView | null>> => {
    const res = await loadRulesSummary();
    if (!res.ok) return res;
    const { source, summary } = res.data;
    const option = summary.options.find((o) => o.optionId === id);
    if (!option) return { ok: true, data: null };
    const name = source.name;
    const type = summary.types.find((t) => t.typeId === option.typeId);

    // Each answer is `resolveForProduct`'s — the storefront's own call.
    const offering = source.products
      .filter((p) =>
        (resolveForProduct(source.catalog, p, source.graph, source.index).availableByType.get(option.typeId) ?? []).includes(id),
      )
      .map((p) => ({ id: p._id, title: p.title ?? p._id, ...(p.lineTitle ? { lineTitle: p.lineTitle } : {}) }));

    return {
      ok: true,
      data: {
        id,
        title: name(id),
        typeTitle: name(option.typeId),
        ...(type ? { decidedBy: type.decidedBy } : {}),
        status: option.status,
        addedByException: option.addedByException,
        removedByException: option.removedByException,
        studioUrl: studioEditUrl("customizationOption", id),
        partners: option.partners.map((p) => ({
          typeId: p.typeId,
          typeTitle: name(p.typeId),
          relation: p.relation,
          text:
            p.coverage === "all"
              ? `all ${p.typeSize}`
              : p.coverage === "all-but"
                ? `all except ${(p.missing ?? []).map(name).join(", ")}`
                : p.partnerIds.map(name).join(", "),
        })),
        offering,
      },
    };
  },
);
