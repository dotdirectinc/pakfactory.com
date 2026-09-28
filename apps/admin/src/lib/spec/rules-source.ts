import { cache } from "react";
import { createClient } from "next-sanity";
import { CATALOG_CUSTOMIZATION_RULES_QUERY } from "@pakfactory/sanity/queries";
import type { ProductDimensionRangeMm } from "@pakfactory/sanity/resolve-product-dims";
import {
  summarizeRules,
  type RulesSummary,
  type SummaryCatalog,
  type SummaryProduct,
} from "@pakfactory/sanity/customization-rules/summary";
import { buildDependencyGraph } from "@pakfactory/sanity/customization-rules/dependencies";
import { buildCompatibilityIndex } from "@pakfactory/sanity/customization-rules";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";

/**
 * The one Sanity read behind every Spec System page (PROD-2560, PROD-2614).
 *
 * Sanity is the source of truth for V1 (option A, 2026-09-18). This reads the same documents
 * with the storefront's own rules query and hands them to the shared package; no page computes
 * a rule itself. Memoised per request, so a page that needs the summary and one product's
 * resolution fetches once.
 */

/**
 * Pinned to `development` (decision 2026-09-25): the rules exist only there until the
 * production fill runs (PROD-2596). Deliberately NOT the ambient `NEXT_PUBLIC_SANITY_DATASET`,
 * which admin's search reads and which says `production` on the deployed app — that would show
 * an empty rule set that looks like an answer.
 */
export const RULES_DATASET = process.env.ADMIN_SPEC_RULES_DATASET?.trim() || "development";

const QUERY = /* groq */ `{
  "rules": ${CATALOG_CUSTOMIZATION_RULES_QUERY},
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]{ _id, title },
  "products": *[_type == "product" && kind == "standard" && !(_id in path("drafts.**"))] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    "lineTitle": productLine->title,
    "styleTitles": coalesce(productStyle[]->title, []),
    dimensionInput,
    dimensionRange,
    "availableCustomizations": coalesce(availableCustomizations[]{ "optionId": customization._ref }, []),
    "customizationExceptions": coalesce(
      customizationExceptions[]{ "optionId": customization._ref, mode, reason },
      []
    )
  }
}`;

export type SourceProduct = SummaryProduct & {
  title?: string;
  slug?: string;
  lineTitle?: string;
  styleTitles: string[];
  dimensionInput?: string;
  dimensionRange?: ProductDimensionRangeMm;
};

export type RulesSource = {
  dataset: string;
  catalog: SummaryCatalog;
  categories: { _id: string; title?: string }[];
  products: SourceProduct[];
  /** Built once per request; every resolution below reuses them. */
  graph: ReturnType<typeof buildDependencyGraph>;
  index: ReturnType<typeof buildCompatibilityIndex>;
  /** id → display name, for types, options and categories. */
  name: (id: string) => string;
};

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

type QueryResult = {
  rules: SummaryCatalog;
  categories: { _id: string; title?: string }[];
  products: SourceProduct[];
};

export const loadRulesSource = cache(async (): Promise<Loaded<RulesSource>> => {
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
  const names = new Map<string, string>();
  for (const c of result.categories) names.set(c._id, c.title ?? c._id);
  for (const t of catalog.types) names.set(t._id, t.title ?? t._id);
  for (const o of catalog.options) names.set(o._id, o.title ?? o._id);

  return {
    ok: true,
    data: {
      dataset: RULES_DATASET,
      catalog,
      categories: result.categories,
      products: result.products.map((p) => ({ ...p, styleTitles: p.styleTitles ?? [] })),
      graph: buildDependencyGraph(catalog),
      index: buildCompatibilityIndex(catalog.options),
      name: (id) => names.get(id) ?? id,
    },
  };
});

export const loadRulesSummary = cache(
  async (): Promise<Loaded<{ source: RulesSource; summary: RulesSummary }>> => {
    const res = await loadRulesSource();
    if (!res.ok) return res;
    const summary = summarizeRules(
      { catalog: res.data.catalog, products: res.data.products },
      res.data.index,
    );
    return { ok: true, data: { source: res.data, summary } };
  },
);
