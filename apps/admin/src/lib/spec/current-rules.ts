import type { PartnerGroup } from "@pakfactory/sanity/customization-rules/summary";
import { loadRulesSummary, RULES_DATASET, type Loaded } from "./rules-source";
import { cachedSpec } from "./cache";

/**
 * The current rules, read from Sanity and computed by the shared package (PROD-2560).
 *
 * Sanity is the source of truth for V1 (option A, 2026-09-18), so this reads the same
 * documents with the same query the storefront uses and hands them to the same code. The
 * registry is not consulted: its copy is the approved seed, which editors move away from.
 *
 * Computed on every read, never stored (2026-09-25). The read lives in `rules-source.ts`,
 * shared by every Spec System page.
 */

export { RULES_DATASET };

/** A partner group as the screen shows it: names, not ids, and only the short list. */
export type PartnerLine = {
  typeTitle: string;
  relation: PartnerGroup["relation"];
  coverage: PartnerGroup["coverage"];
  typeSize: number;
  count: number;
  /** `some`: the partners. `all-but`: the ones missing. `all`: empty. */
  names: string[];
};

export type RuleTypeRow = {
  id: string;
  title: string;
  categoryTitle: string;
  decidedBy: "product" | "customization";
  state: "product" | "constrained" | "unconstrained" | "resolves-to-nothing";
  customerSelects: "one" | "many";
  /** Each requirement as its entries' names: every row required, any entry within one. */
  requirements: { name: string; isCategory: boolean }[][];
  optionCount: number;
  productsOffering: number;
};

/** An option as the list shows it. Its partner lines load on demand (see `getOptionPartners`). */
export type RuleOptionRow = {
  id: string;
  title: string;
  typeId: string;
  typeTitle: string;
  status: "offered" | "offered-nowhere" | "compatible-with-nothing" | "unknown-type";
  productCount: number;
  addedByException: number;
  removedByException: number;
  /** How many partner types it has — the lines themselves load when the row is expanded. */
  partnerTypes: number;
  /** Names of the requirements it can never meet ("Ink"). */
  unmetRequirements: string[];
};

export type RuleExceptionRow = {
  productTitle: string;
  optionTitle: string;
  mode: "add" | "remove";
  effect: string;
  reason?: string;
};

export type CurrentRules = {
  dataset: string;
  totals: { products: number; types: number; options: number; pairs: number; exceptions: number };
  types: RuleTypeRow[];
  options: RuleOptionRow[];
  exceptions: RuleExceptionRow[];
  attention: {
    missingReferences: { id: string; references: number }[];
    siblingPairs: [string, string][];
    referencePairs: [string, string][];
    unknownDependencyReferences: string[];
  };
};

export type CurrentRulesResult = Loaded<CurrentRules>;

/**
 * Current rules, cached (see `cache.ts`). Option rows carry no partner lines: those were 422 of
 * the page's 432 KB, and most visits never open them.
 */
export const getCurrentRules = cachedSpec("current-rules", async (): Promise<CurrentRulesResult> => {
  const res = await buildCurrentRules();
  if (!res.ok) return res;
  const { partners: _partners, ...rest } = res.data;
  void _partners;
  return { ok: true, data: rest };
});

/** Every option's partner lines, cached as one entry; the API route hands out one at a time. */
export const getOptionPartners = cachedSpec(
  "option-partners",
  async (): Promise<Loaded<Record<string, PartnerLine[]>>> => {
    const res = await buildCurrentRules();
    return res.ok ? { ok: true, data: res.data.partners } : res;
  },
);

async function buildCurrentRules(): Promise<Loaded<CurrentRules & { partners: Record<string, PartnerLine[]> }>> {
  const res = await loadRulesSummary();
  if (!res.ok) return res;
  const { source, summary } = res.data;
  const label = source.name;
  const productName = new Map(source.products.map((p) => [p._id, p.title ?? p._id]));
  const typeById = new Map(summary.types.map((t) => [t.typeId, t]));

  const types: RuleTypeRow[] = summary.types.map((t) => ({
    id: t.typeId,
    title: label(t.typeId),
    categoryTitle: t.categoryId ? label(t.categoryId) : "",
    decidedBy: t.decidedBy,
    state: t.state,
    customerSelects: t.customerSelects,
    requirements: t.requirements.map((req) =>
      req.map((e) => ({ name: label(e.id), isCategory: e.kind === "category" })),
    ),
    optionCount: t.optionCount,
    productsOffering: t.productsOffering,
  }));

  const partners: Record<string, PartnerLine[]> = {};
  const options: RuleOptionRow[] = summary.options.map((o) => {
    const type = typeById.get(o.typeId);
    const groups = type?.groups ?? [];
    // Name an unmet requirement as the editor wrote it ("Materials"), not as its sixteen member
    // types. Groups line up with the written requirements unless one expanded to nothing or
    // duplicated another; then fall back to the expanded types.
    const written = type && type.requirements.length === groups.length ? type.requirements : null;
    const requirementName = (i: number) =>
      (written?.[i] ?? (groups[i] ?? []).map((id) => ({ id }))).map((e) => label(e.id)).join(" or ");
    partners[o.optionId] = o.partners.map((p) => ({
      typeTitle: label(p.typeId),
      relation: p.relation,
      coverage: p.coverage,
      typeSize: p.typeSize,
      count: p.partnerIds.length,
      names:
        p.coverage === "all" ? [] : (p.coverage === "all-but" ? p.missing ?? [] : p.partnerIds).map(label),
    }));
    return {
      id: o.optionId,
      title: label(o.optionId),
      typeId: o.typeId,
      typeTitle: label(o.typeId),
      status: o.status,
      productCount: o.productCount,
      addedByException: o.addedByException,
      removedByException: o.removedByException,
      partnerTypes: o.partners.length,
      unmetRequirements: o.unpairedRequirements.map(requirementName),
    };
  });

  const exceptions: RuleExceptionRow[] = summary.exceptions.map((e) => ({
    productTitle: productName.get(e.productId) ?? e.productId,
    optionTitle: label(e.optionId),
    mode: e.mode,
    effect: e.effect,
    ...(e.reason ? { reason: e.reason } : {}),
  }));

  // "A → B" per reference; the screen needs the missing ids and how often each is named.
  const missing = new Map<string, number>();
  for (const ref of summary.diagnostics.danglingReferences) {
    const id = ref.split(" → ")[1] ?? ref;
    missing.set(id, (missing.get(id) ?? 0) + 1);
  }

  return {
    ok: true,
    data: {
      dataset: source.dataset,
      totals: summary.totals,
      types,
      options,
      partners,
      exceptions,
      attention: {
        missingReferences: [...missing]
          .map(([id, references]) => ({ id, references }))
          .sort((a, b) => b.references - a.references),
        siblingPairs: summary.diagnostics.siblingPairs.map(([a, b]) => [label(a), label(b)]),
        referencePairs: summary.diagnostics.referencePairs.map(([a, b]) => [label(a), label(b)]),
        unknownDependencyReferences: summary.diagnostics.unknownDependencyReferences,
      },
    },
  };
}
