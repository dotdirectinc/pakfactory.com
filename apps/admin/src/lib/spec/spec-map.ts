import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
import type { TableKey } from "./catalog-table-model";

/**
 * The Spec Map's data (PROD-2960): every published record of the Catalog's levels as a card, and
 * the arrows between them — the same streams and levels as the Catalog tabs. One Sanity read,
 * cached like the other Spec views. Cards and arrows are indexes into one list, so the payload stays
 * small (~3,000 cards, ~5,000 arrows).
 *
 * Arrows run parent → child:
 *   · line → style → standard product (a product with no style hangs off its line);
 *   · standard product → the property values it states (Product properties & values);
 *   · category → type → option → the property values it has (Option properties & values);
 *   · solution → solution style, and solution → inspiration product. Inspiration products do not
 *     reference a solution style in Sanity, so their arrows come from the solution itself.
 * `links` are cross-stream relations drawn only when selected: an inspiration product's base product.
 */

export type MapNode = {
  level: TableKey;
  id: string;
  title: string;
  code: string | null;
  status: string | null;
  /** A property value's property, shown under its name. */
  sub?: string;
};

export type SpecMapData = {
  dataset: string;
  nodes: MapNode[];
  /** [parent, child] indexes into `nodes`. */
  edges: [number, number][];
  /** [inspiration product, base product] indexes into `nodes`. */
  links: [number, number][];
};

const P = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const CARD = `_id, title, status, entityCode`;

const MAP_QUERY = /* groq */ `{
  "productLine": *[_type == "productLine" && ${P}]{ ${CARD} },
  "productStyle": *[_type == "productStyle" && ${P}]{ ${CARD}, "up": [productLine._ref] },
  "product": *[_type == "product" && kind != "inspiration" && ${P}]{
    ${CARD}, "styles": coalesce(productStyle[]._ref, []), "line": productLine._ref,
    "values": coalesce(properties[].values[]._ref, [])
  },
  "customizationCategory": *[_type == "customizationCategory" && ${P}]{ ${CARD} },
  "customizationType": *[_type == "customizationType" && ${P}]{ ${CARD}, "up": [category._ref] },
  "customizationOption": *[_type == "customizationOption" && ${P}]{ ${CARD}, "up": [type._ref], "values": coalesce(properties[]._ref, []) },
  "solution": *[_type == "solution" && ${P}]{ ${CARD} },
  "solutionStyle": *[_type == "solutionStyle" && ${P}]{ ${CARD}, "up": [solution._ref] },
  "inspiration": *[_type == "product" && kind == "inspiration" && ${P}]{ ${CARD}, "up": coalesce(solutions[]._ref, []), "basedOn": basedOn._ref },
  "values": *[_type == "propertyValue" && ${P}]{ ${CARD}, "property": property->title }
}`;

type Card = { _id: string; title?: string; status?: string; entityCode?: string };
type Raw = {
  productLine: Card[];
  productStyle: (Card & { up: (string | null)[] })[];
  product: (Card & { styles: string[]; line?: string; values: string[] })[];
  customizationCategory: Card[];
  customizationType: (Card & { up: (string | null)[] })[];
  customizationOption: (Card & { up: (string | null)[]; values: string[] })[];
  solution: Card[];
  solutionStyle: (Card & { up: (string | null)[] })[];
  inspiration: (Card & { up: string[]; basedOn?: string })[];
  values: (Card & { property?: string })[];
};

/** Pure: cards and arrows from the raw read. Exported for tests. */
export function buildSpecMap(raw: Raw, dataset: string): SpecMapData {
  const nodes: MapNode[] = [];
  const at = new Map<string, number>();
  const add = (level: TableKey, c: Card, sub?: string) => {
    at.set(`${level}:${c._id}`, nodes.length);
    nodes.push({ level, id: c._id, title: c.title ?? c._id, code: c.entityCode ?? null, status: c.status ?? null, ...(sub ? { sub } : {}) });
  };
  const edges: [number, number][] = [];
  const links: [number, number][] = [];
  const edge = (fromLevel: TableKey, from: string | null | undefined, toLevel: TableKey, to: string) => {
    const a = from ? at.get(`${fromLevel}:${from}`) : undefined;
    const b = at.get(`${toLevel}:${to}`);
    if (a !== undefined && b !== undefined) edges.push([a, b]);
  };

  // Value cards per stream: a value appears in a stream when a record of that stream uses it.
  const valueById = new Map(raw.values.map((v) => [v._id, v]));
  const usedBy = (ids: string[][]) => [...new Set(ids.flat())].filter((id) => valueById.has(id)).map((id) => valueById.get(id)!);
  const byTitle = <T extends Card>(xs: T[]) => [...xs].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  for (const c of byTitle(raw.productLine)) add("productLine", c);
  for (const c of byTitle(raw.productStyle)) add("productStyle", c);
  for (const c of byTitle(raw.product)) add("product", c);
  for (const v of byTitle(usedBy(raw.product.map((p) => p.values)))) add("productValue", v, v.property);
  for (const c of byTitle(raw.customizationCategory)) add("customizationCategory", c);
  for (const c of byTitle(raw.customizationType)) add("customizationType", c);
  for (const c of byTitle(raw.customizationOption)) add("customizationOption", c);
  for (const v of byTitle(usedBy(raw.customizationOption.map((o) => o.values)))) add("optionValue", v, v.property);
  for (const c of byTitle(raw.solution)) add("solution", c);
  for (const c of byTitle(raw.solutionStyle)) add("solutionStyle", c);
  for (const c of byTitle(raw.inspiration)) add("inspiration", c);

  for (const s of raw.productStyle) for (const up of s.up) edge("productLine", up, "productStyle", s._id);
  for (const p of raw.product) {
    const styles = p.styles.filter((id) => at.has(`productStyle:${id}`));
    if (styles.length) for (const s of styles) edge("productStyle", s, "product", p._id);
    else edge("productLine", p.line, "product", p._id);
    for (const v of new Set(p.values)) edge("product", p._id, "productValue", v);
  }
  for (const t of raw.customizationType) for (const up of t.up) edge("customizationCategory", up, "customizationType", t._id);
  for (const o of raw.customizationOption) {
    for (const up of o.up) edge("customizationType", up, "customizationOption", o._id);
    for (const v of new Set(o.values)) edge("customizationOption", o._id, "optionValue", v);
  }
  for (const s of raw.solutionStyle) for (const up of s.up) edge("solution", up, "solutionStyle", s._id);
  for (const i of raw.inspiration) {
    for (const up of new Set(i.up)) edge("solution", up, "inspiration", i._id);
    const a = at.get(`inspiration:${i._id}`);
    const b = i.basedOn ? at.get(`product:${i.basedOn}`) : undefined;
    if (a !== undefined && b !== undefined) links.push([a, b]);
  }

  return { dataset, nodes, edges, links };
}

export const getSpecMap = cachedSpec("spec-map", async (): Promise<Loaded<SpecMapData>> => {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  try {
    const raw = await client.fetch<Raw>(MAP_QUERY, {}, { cache: "no-store" });
    return { ok: true, data: buildSpecMap(raw, RULES_DATASET) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
});
