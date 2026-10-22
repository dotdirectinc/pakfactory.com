import { cache } from "react";
import { createClient } from "next-sanity";
import { CATALOG_CUSTOMIZATION_RULES_ALL_OPTIONS_QUERY } from "@pakfactory/sanity/queries";
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
import { typeidToUuid } from "@/lib/spec/typeid";

/**
 * The one Sanity read behind every Spec System page (PROD-2560, PROD-2614).
 *
 * Sanity is the source of truth for V1 (option A, 2026-09-18). This reads the same documents
 * with the storefront's own rules query and hands them to the shared package; no page computes
 * a rule itself. One difference: it reads Not active options too. Not active only hides an option
 * on the site; its offers and pairs are still rules to see and edit (2026-10-22). Memoised per request, so a page that needs the summary and one product's
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
  "rules": ${CATALOG_CUSTOMIZATION_RULES_ALL_OPTIONS_QUERY},
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]{ _id, title },
  "products": *[_type == "product" && kind == "standard" && !(_id in path("drafts.**"))] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    "lineTitle": productLine->title,
    "styleTitles": coalesce(productStyle[]->title, []),
    "lineId": productLine._ref,
    "styleIds": coalesce(productStyle[]._ref, []),
    "solutionIds": coalesce(solutions[]._ref, []),
    dimensionInput,
    dimensionRange,
    "availableCustomizations": coalesce(availableCustomizations[]{ "optionId": customization._ref }, []),
    "customizationExceptions": coalesce(
      customizationExceptions[]{ "optionId": customization._ref, mode, reason },
      []
    )
  },
  "inspirations": *[_type == "product" && kind == "inspiration" && !(_id in path("drafts.**")) && defined(basedOn)] {
    _id,
    title,
    "basedOn": basedOn._ref,
    "preselected": coalesce(availableCustomizations[preselected == true].customization._ref, []),
    "solutionIds": coalesce(solutions[]._ref, [])
  },
  "lines": *[_type == "productLine" && !(_id in path("drafts.**"))] | order(title asc) { _id, title },
  "styles": *[_type == "productStyle" && !(_id in path("drafts.**"))] | order(title asc) { _id, title, "lineId": productLine._ref },
  "solutions": *[_type == "solution" && !(_id in path("drafts.**"))] | order(title asc) { _id, title },
  "solutionStyles": *[_type == "solutionStyle" && !(_id in path("drafts.**"))] | order(title asc) { _id, title, "solutionId": solution._ref },
  "identity": *[
    _type in ["product", "customizationOption", "customizationType", "customizationCategory", "productLine", "productStyle", "solution", "solutionStyle"] &&
    !(_id in path("drafts.**")) &&
    defined(entityCode)
  ]{ _id, entityId, entityCode, sku }
}`;

export type SourceProduct = SummaryProduct & {
  title?: string;
  slug?: string;
  lineTitle?: string;
  styleTitles: string[];
  /** Its parents (PROD-3007): line, styles (first = primary), solutions (first = primary). */
  lineId?: string;
  styleIds: string[];
  solutionIds: string[];
  dimensionInput?: string;
  dimensionRange?: ProductDimensionRangeMm;
};

/** The registry's identity of a document, as the catalog fill copies it into Sanity (PROD-2628). */
/** `sku`: a product's or inspiration product's own reference — shown before the code (2026-10-22). */
export type RegistryIdentity = { entityId: string; entityCode: string; sku?: string };

export type Inspiration = { _id: string; title?: string; basedOn: string; preselected: string[]; solutionIds?: string[] };
/** A line, style or solution: what a move points at (PROD-3007). */
export type StructureRecord = { _id: string; title?: string; lineId?: string };

export type RulesSource = {
  dataset: string;
  catalog: SummaryCatalog;
  categories: { _id: string; title?: string }[];
  products: SourceProduct[];
  /**
   * Inspiration products: no rules of their own — they offer what their base ("Based on") offers — but
   * they pre-select some of it (what the site's configurator starts from: `preselected == true`).
   */
  inspirations: Inspiration[];
  lines: StructureRecord[];
  styles: StructureRecord[];
  solutions: StructureRecord[];
  /** Solution styles and their one solution (PROD-3095). */
  solutionStyles: (StructureRecord & { solutionId?: string })[];
  /** Built once per request; every resolution below reuses them. */
  graph: ReturnType<typeof buildDependencyGraph>;
  index: ReturnType<typeof buildCompatibilityIndex>;
  /** id → display name, for types, options, categories, products, lines, styles and solutions. */
  name: (id: string) => string;
  /**
   * Whether an option is active on the site (its own status, and its Type's and Category's). The
   * catalog holds Not active options too; only what imitates the storefront leaves them out.
   */
  isActive: (optionId: string) => boolean;
  /** id → registry id and code; undefined for a document the registry has not registered. */
  identity: (id: string) => RegistryIdentity | undefined;
  /** Registry uuid → the Sanity id of its document (the server answers in registry ids). */
  fromRegistry: (uuid: string) => string | undefined;
};

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

type QueryResult = {
  rules: Omit<SummaryCatalog, "options"> & { options: (SummaryCatalog["options"][number] & { status?: string })[] };
  categories: { _id: string; title?: string }[];
  products: SourceProduct[];
  identity: ({ _id: string } & RegistryIdentity)[];
  inspirations?: Inspiration[];
  lines?: StructureRecord[];
  styles?: StructureRecord[];
  solutions?: StructureRecord[];
  solutionStyles?: (StructureRecord & { solutionId?: string })[];
};

export const loadRulesSource = cache(async (): Promise<Loaded<RulesSource>> => {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };

  const client = createClient({
    projectId,
    dataset: RULES_DATASET,
    apiVersion: getSanityApiVersion(),
    // Not the CDN: it lags a write by seconds, and right after an approved rule edit that stale read was
    // cached for a minute, so the Map still showed the old rule (2026-10-14). The views are cached anyway.
    useCdn: false,
    perspective: "published",
  });

  let result: QueryResult;
  try {
    // Not cached here: the raw response (~2.4 MB on development) is over Next's 2 MB data-cache
    // limit, so every attempt failed and logged. The computed views are cached instead
    // (`cache.ts`), which means this read only runs on a miss.
    result = await client.fetch<QueryResult>(QUERY, {}, { cache: "no-store" });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }

  const catalog: SummaryCatalog = { ...result.rules, categories: result.categories };
  const names = new Map<string, string>();
  for (const c of result.categories) names.set(c._id, c.title ?? c._id);
  for (const t of catalog.types) names.set(t._id, t.title ?? t._id);
  for (const o of catalog.options) names.set(o._id, o.title ?? o._id);
  // Products too: the rule-edit checks and the impact name them (PROD-2962).
  for (const p of result.products) names.set(p._id, p.title ?? p._id);
  for (const x of [...(result.inspirations ?? []), ...(result.lines ?? []), ...(result.styles ?? []), ...(result.solutions ?? []), ...(result.solutionStyles ?? [])]) names.set(x._id, x.title ?? x._id);
  const inactive = new Set(result.rules.options.filter((o) => o.status !== "active").map((o) => o._id));
  const identities = new Map((result.identity ?? []).map(({ _id, entityId, entityCode, sku }) => [_id, { entityId, entityCode, ...(sku ? { sku } : {}) }]));
  const bySanity = new Map<string, string>();
  for (const [id, x] of identities) {
    const u = typeidToUuid(x.entityId)?.uuid;
    if (u) bySanity.set(u, id);
  }

  return {
    ok: true,
    data: {
      dataset: RULES_DATASET,
      catalog,
      categories: result.categories,
      products: result.products.map((p) => ({ ...p, styleTitles: p.styleTitles ?? [], styleIds: p.styleIds ?? [], solutionIds: p.solutionIds ?? [] })),
      inspirations: result.inspirations ?? [],
      lines: result.lines ?? [],
      styles: result.styles ?? [],
      solutions: result.solutions ?? [],
      solutionStyles: result.solutionStyles ?? [],
      graph: buildDependencyGraph(catalog),
      index: buildCompatibilityIndex(catalog.options),
      name: (id) => names.get(id) ?? id,
      isActive: (id) => !inactive.has(id),
      identity: (id) => identities.get(id),
      fromRegistry: (uuid) => bySanity.get(uuid),
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
