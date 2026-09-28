import { createClient } from "next-sanity";
import { CATALOG_CUSTOMIZATION_RULES_QUERY } from "@pakfactory/sanity/queries";
import {
  summarizeRules,
  type SummaryCatalog,
  type SummaryProduct,
  type PartnerGroup,
} from "@pakfactory/sanity/customization-rules/summary";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";

/**
 * The current rules, read from Sanity and computed by the shared package (PROD-2560).
 *
 * Sanity is the source of truth for V1 (option A, 2026-09-18), so this reads the same
 * documents with the same query the storefront uses and hands them to the same code. The
 * registry is not consulted: its copy is the approved seed, which editors move away from.
 *
 * Computed on every read, never stored (2026-09-25).
 */

/**
 * Pinned to `development` (decision 2026-09-25): the rules exist only there until the
 * production fill runs (PROD-2596). Deliberately NOT the ambient `NEXT_PUBLIC_SANITY_DATASET`,
 * which admin's search reads and which will say `production` on the deployed app — that would
 * show an empty rule set that looks like an answer.
 */
export const RULES_DATASET = process.env.ADMIN_SPEC_RULES_DATASET?.trim() || "development";

const QUERY = /* groq */ `{
  "rules": ${CATALOG_CUSTOMIZATION_RULES_QUERY},
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]{ _id, title },
  "products": *[_type == "product" && kind == "standard" && !(_id in path("drafts.**"))] | order(title asc) {
    _id,
    title,
    "availableCustomizations": coalesce(availableCustomizations[]{ "optionId": customization._ref }, []),
    "customizationExceptions": coalesce(
      customizationExceptions[]{ "optionId": customization._ref, mode, reason },
      []
    )
  }
}`;

type QueryResult = {
  rules: SummaryCatalog;
  categories: { _id: string; title?: string }[];
  products: SummaryProduct[];
};

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

export type RuleOptionRow = {
  id: string;
  title: string;
  typeId: string;
  typeTitle: string;
  status: "offered" | "offered-nowhere" | "compatible-with-nothing" | "unknown-type";
  productCount: number;
  addedByException: number;
  removedByException: number;
  partners: PartnerLine[];
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

export type CurrentRulesResult =
  | { ok: true; data: CurrentRules }
  | { ok: false; error: string };

export async function getCurrentRules(): Promise<CurrentRulesResult> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };

  const client = createClient({
    projectId,
    dataset: RULES_DATASET,
    apiVersion: getSanityApiVersion(),
    useCdn: true,
    perspective: "published",
  });

  let result: QueryResult;
  try {
    result = await client.fetch<QueryResult>(QUERY, {}, { next: { revalidate: 60 } });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }

  const catalog: SummaryCatalog = { ...result.rules, categories: result.categories };
  const summary = summarizeRules({ catalog, products: result.products });

  const name = new Map<string, string>();
  for (const c of result.categories) name.set(c._id, c.title ?? c._id);
  for (const t of catalog.types) name.set(t._id, t.title ?? t._id);
  for (const o of catalog.options) name.set(o._id, o.title ?? o._id);
  const productName = new Map(result.products.map((p) => [p._id, p.title ?? p._id]));
  const label = (id: string) => name.get(id) ?? id;
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

  const options: RuleOptionRow[] = summary.options.map((o) => {
    const type = typeById.get(o.typeId);
    const groups = type?.groups ?? [];
    // Name an unmet requirement as the editor wrote it ("Materials"), not as its sixteen member
    // types. Groups line up with the written requirements unless one expanded to nothing or
    // duplicated another; then fall back to the expanded types.
    const written = type && type.requirements.length === groups.length ? type.requirements : null;
    const requirementName = (i: number) =>
      (written?.[i] ?? (groups[i] ?? []).map((id) => ({ id }))).map((e) => label(e.id)).join(" or ");
    return {
      id: o.optionId,
      title: label(o.optionId),
      typeId: o.typeId,
      typeTitle: label(o.typeId),
      status: o.status,
      productCount: o.productCount,
      addedByException: o.addedByException,
      removedByException: o.removedByException,
      partners: o.partners.map((p) => ({
        typeTitle: label(p.typeId),
        relation: p.relation,
        coverage: p.coverage,
        typeSize: p.typeSize,
        count: p.partnerIds.length,
        names:
          p.coverage === "all" ? [] : (p.coverage === "all-but" ? p.missing ?? [] : p.partnerIds).map(label),
      })),
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
      dataset: RULES_DATASET,
      totals: summary.totals,
      types,
      options,
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
