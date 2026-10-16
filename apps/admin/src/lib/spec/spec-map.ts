import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
import { filterParams, productMatchesSolutionStyleFilter, type SolutionStyleFilter } from "@pakfactory/sanity/solution-style-filter";
import type { TableKey } from "./catalog-table-model";
import type { MoveDraft } from "./rule-edits";

/**
 * The Spec Map's data (PROD-2960): every published record of the Catalog's levels as a card, and
 * the arrows between them — the same streams and levels as the Catalog tabs. One Sanity read,
 * cached like the other Spec views. Cards and arrows are indexes into one list, so the payload stays
 * small (~3,000 cards, ~5,000 arrows).
 *
 * Arrows run parent → child:
 *   · line → style → standard product (a product with no style hangs off its line);
 *   · standard product → the properties it states → their values (a map-only "Properties" column,
 *     2026-10-14). A property is shared by many products, so `stated` keeps each product's own values:
 *     the map's walk stops at a property card and links a product to its values through `stated`;
 *   · category → type → option → the values it lists; type → the properties it DECLARES → their
 *     values. Arrows start where the relation is defined (2026-10-14): an option stores values only,
 *     and every value's property is declared by the option's type (0 exceptions on development);
 *   · solution → solution style; solution → inspiration product (the product's `solutions`); and
 *     solution style → inspiration product where the style's FILTER matches it — a style's members
 *     are a rule, not references (the storefront's own matcher, status left out: the map shows all).
 * `links` are cross-stream relations drawn only when selected: an inspiration product's base product.
 */

/** The map-only Properties column of the Products stream (no Catalog table of its own). */
export const MAP_PROPERTY = "productProperty" as TableKey;
/** The same column in the Customizations stream. */
export const MAP_OPTION_PROPERTY = "optionProperty" as TableKey;

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
  /** [standard product or option, property value] — the values each record states (see the header). */
  stated: [number, number][];
};

const P = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const CARD = `_id, title, status, entityCode`;

const MAP_QUERY = /* groq */ `{
  "productLine": *[_type == "productLine" && ${P}]{ ${CARD} },
  "productStyle": *[_type == "productStyle" && ${P}]{ ${CARD}, "up": [productLine._ref] },
  "product": *[_type == "product" && kind != "inspiration" && ${P}]{
    ${CARD}, "styles": coalesce(productStyle[]._ref, []), "line": productLine._ref,
    "values": coalesce(properties[].values[]._ref, []),
    "props": coalesce(properties[].property._ref, [])
  },
  "property": *[_type == "property" && ${P}]{ ${CARD} },
  "customizationCategory": *[_type == "customizationCategory" && ${P}]{ ${CARD} },
  "customizationType": *[_type == "customizationType" && ${P}]{ ${CARD}, "up": [category._ref], "declares": coalesce(properties[].property._ref, []) },
  "customizationOption": *[_type == "customizationOption" && ${P}]{ ${CARD}, "up": [type._ref], "values": coalesce(properties[]._ref, []) },
  "solution": *[_type == "solution" && ${P}]{ ${CARD} },
  "solutionStyle": *[_type == "solutionStyle" && ${P}]{ ${CARD}, "up": [solution._ref], filter, "excluded": excludedProducts },
  "inspiration": *[_type == "product" && kind == "inspiration" && ${P}]{
    ${CARD}, "up": coalesce(solutions[]._ref, []), "basedOn": basedOn._ref,
    "line": productLine._ref, "styles": coalesce(productStyle[]._ref, [])
  },
  "values": *[_type == "propertyValue" && ${P}]{ ${CARD}, "property": property->title, "propertyId": property._ref }
}`;

type Card = { _id: string; title?: string; status?: string; entityCode?: string };
type Raw = {
  productLine: Card[];
  productStyle: (Card & { up: (string | null)[] })[];
  product: (Card & { styles: string[]; line?: string; values: string[]; props: string[] })[];
  property: Card[];
  customizationCategory: Card[];
  customizationType: (Card & { up: (string | null)[]; declares: string[] })[];
  customizationOption: (Card & { up: (string | null)[]; values: string[] })[];
  solution: Card[];
  solutionStyle: (Card & { up: (string | null)[]; filter?: SolutionStyleFilter; excluded?: { _ref: string }[] })[];
  inspiration: (Card & { up: string[]; basedOn?: string; line?: string; styles: string[] })[];
  values: (Card & { property?: string; propertyId?: string })[];
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
  const stated: [number, number][] = [];
  const drawnEdges = new Set<string>();
  const edge = (fromLevel: TableKey, from: string | null | undefined, toLevel: TableKey, to: string) => {
    const a = from ? at.get(`${fromLevel}:${from}`) : undefined;
    const b = at.get(`${toLevel}:${to}`);
    // Once per pair: a record can list the same reference twice (and several values share a property).
    if (a === undefined || b === undefined || drawnEdges.has(`${a}-${b}`)) return;
    drawnEdges.add(`${a}-${b}`);
    edges.push([a, b]);
  };

  // Value cards per stream: a value appears in a stream when a record of that stream uses it.
  const valueById = new Map(raw.values.map((v) => [v._id, v]));
  const usedBy = (ids: string[][]) => [...new Set(ids.flat())].filter((id) => valueById.has(id)).map((id) => valueById.get(id)!);
  const byTitle = <T extends Card>(xs: T[]) => [...xs].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  for (const c of byTitle(raw.productLine)) add("productLine", c);
  for (const c of byTitle(raw.productStyle)) add("productStyle", c);
  for (const c of byTitle(raw.product)) add("product", c);
  const usedProps = new Set(raw.product.flatMap((p) => p.props));
  for (const c of byTitle(raw.property.filter((p) => usedProps.has(p._id)))) add(MAP_PROPERTY, c);
  for (const v of byTitle(usedBy(raw.product.map((p) => p.values)))) add("productValue", v, v.property);
  for (const c of byTitle(raw.customizationCategory)) add("customizationCategory", c);
  for (const c of byTitle(raw.customizationType)) add("customizationType", c);
  for (const c of byTitle(raw.customizationOption)) add("customizationOption", c);
  const optionValues = usedBy(raw.customizationOption.map((o) => o.values));
  const optionProps = new Set([...optionValues.map((v) => v.propertyId), ...raw.customizationType.flatMap((t) => t.declares)]);
  for (const c of byTitle(raw.property.filter((p) => optionProps.has(p._id)))) add(MAP_OPTION_PROPERTY, c);
  for (const v of byTitle(optionValues)) add("optionValue", v, v.property);
  for (const c of byTitle(raw.solution)) add("solution", c);
  for (const c of byTitle(raw.solutionStyle)) add("solutionStyle", c);
  for (const c of byTitle(raw.inspiration)) add("inspiration", c);

  for (const s of raw.productStyle) for (const up of s.up) edge("productLine", up, "productStyle", s._id);
  for (const p of raw.product) {
    const styles = p.styles.filter((id) => at.has(`productStyle:${id}`));
    if (styles.length) for (const s of styles) edge("productStyle", s, "product", p._id);
    else edge("productLine", p.line, "product", p._id);
    for (const pr of new Set(p.props)) edge("product", p._id, MAP_PROPERTY, pr);
    for (const v of new Set(p.values)) {
      const a = at.get(`product:${p._id}`);
      const b = at.get(`productValue:${v}`);
      if (a !== undefined && b !== undefined) stated.push([a, b]);
    }
  }
  for (const v of raw.values) {
    edge(MAP_PROPERTY, v.propertyId, "productValue", v._id);
    edge(MAP_OPTION_PROPERTY, v.propertyId, "optionValue", v._id);
  }
  for (const t of raw.customizationType) {
    for (const up of t.up) edge("customizationCategory", up, "customizationType", t._id);
    for (const pr of new Set(t.declares)) edge("customizationType", t._id, MAP_OPTION_PROPERTY, pr);
  }
  for (const o of raw.customizationOption) {
    for (const up of o.up) edge("customizationType", up, "customizationOption", o._id);
    // Defined on the option: the values it lists (the property side is its type's declaration).
    for (const v of new Set(o.values)) edge("customizationOption", o._id, "optionValue", v);
  }
  for (const s of raw.solutionStyle) {
    for (const up of s.up) edge("solution", up, "solutionStyle", s._id);
    const solutionId = s.up[0];
    if (!solutionId) continue;
    const params = filterParams(solutionId, s.filter, s.excluded);
    for (const i of raw.inspiration) {
      const member = productMatchesSolutionStyleFilter(
        { id: i._id, kind: "inspiration", title: i.title ?? "", solutionIds: i.up, lineId: i.line ?? null, styleIds: i.styles },
        params,
      );
      if (member) edge("solutionStyle", s._id, "inspiration", i._id);
    }
  }
  for (const i of raw.inspiration) {
    for (const up of new Set(i.up)) edge("solution", up, "inspiration", i._id);
    const a = at.get(`inspiration:${i._id}`);
    const b = i.basedOn ? at.get(`product:${i.basedOn}`) : undefined;
    if (a !== undefined && b !== undefined) links.push([a, b]);
  }

  return { dataset, nodes, edges, links, stated };
}

export const getSpecMap = cachedSpec("spec-map-v5" /* v5: defined-level arrows; Properties columns + `stated` (2026-10-14) */, async (): Promise<Loaded<SpecMapData>> => {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: false, perspective: "published" }); // not the CDN: it lags a write, and the refill after an approved move would cache the old record (2026-10-15)
  try {
    const raw = await client.fetch<Raw>(MAP_QUERY, {}, { cache: "no-store" });
    return { ok: true, data: buildSpecMap(raw, RULES_DATASET) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
});

/**
 * The map with pending moves applied (PROD-3007): each moved record hangs under its new parents, and
 * what hangs under it follows by itself (its own edges are untouched). `moved` are the moved cards.
 */
export function applyMovesToMap(data: SpecMapData, moves: MoveDraft[]): { data: SpecMapData; moved: Set<number> } {
  if (!moves.length) return { data, moved: new Set() };
  const at = new Map(data.nodes.map((n, i) => [`${n.level}:${n.id}`, i]));
  let edges = data.edges;
  let links = data.links;
  const moved = new Set<number>();
  const reparent = (level: TableKey, id: string, from: TableKey[], to: [TableKey, string][]) => {
    const b = at.get(`${level}:${id}`);
    if (b === undefined) return;
    const parents = to.map(([l, x]) => at.get(`${l}:${x}`)).filter((x): x is number => x !== undefined);
    edges = [...edges.filter(([a, c]) => !(c === b && from.includes(data.nodes[a]!.level))), ...parents.map((a) => [a, b] as [number, number])];
    moved.add(b);
  };
  for (const m of moves) {
    switch (m.kind) {
      case "styleLine": reparent("productStyle", m.styleId, ["productLine"], [["productLine", m.lineId]]); break;
      case "placement":
        reparent("product", m.productId, ["productStyle", "productLine"],
          m.styleIds.length ? m.styleIds.map((s) => ["productStyle", s] as [TableKey, string]) : [["productLine", m.lineId]]);
        break;
      case "solutions": reparent("inspiration", m.productId, ["solution"], m.solutionIds.map((s) => ["solution", s] as [TableKey, string])); break;
      case "optionType": reparent("customizationOption", m.optionId, ["customizationType"], [["customizationType", m.typeId]]); break;
      case "typeCategory": reparent("customizationType", m.typeId, ["customizationCategory"], [["customizationCategory", m.categoryId]]); break;
      case "solutionStyleSolution": reparent("solutionStyle", m.styleId, ["solution"], [["solution", m.solutionId]]); break;
      case "basedOn": {
        const a = at.get(`inspiration:${m.productId}`);
        const b = at.get(`product:${m.baseId}`);
        if (a === undefined) break;
        links = [...links.filter(([x]) => x !== a), ...(b !== undefined ? [[a, b] as [number, number]] : [])];
        moved.add(a);
        break;
      }
    }
  }
  return { data: { ...data, edges, links }, moved };
}

/**
 * The move a card dropped onto another card makes (PROD-3007), or null when that is not a parent of it.
 * Dropping onto a style or a solution makes it the PRIMARY one (Richard, 2026-10-15): a product's other
 * styles stay if they are in the new line, a product's other solutions stay; the line follows the style.
 */
export function dropMove(
  child: MapNode,
  target: MapNode,
  current: { lineOf: (styleId: string) => string | undefined; styleIds?: string[]; solutionIds?: string[] },
): MoveDraft | null {
  if (child.level === "productStyle" && target.level === "productLine") return { kind: "styleLine", styleId: child.id, lineId: target.id };
  if (child.level === "product" && target.level === "productStyle") {
    const lineId = current.lineOf(target.id);
    if (!lineId) return null;
    const others = (current.styleIds ?? []).filter((s) => s !== target.id && current.lineOf(s) === lineId);
    return { kind: "placement", productId: child.id, lineId, styleIds: [target.id, ...others] };
  }
  if (child.level === "customizationOption" && target.level === "customizationType") return { kind: "optionType", optionId: child.id, typeId: target.id };
  if (child.level === "customizationType" && target.level === "customizationCategory") return { kind: "typeCategory", typeId: child.id, categoryId: target.id };
  if (child.level === "solutionStyle" && target.level === "solution") return { kind: "solutionStyleSolution", styleId: child.id, solutionId: target.id };
  if (child.level === "inspiration" && target.level === "solution") {
    return { kind: "solutions", productId: child.id, solutionIds: [target.id, ...(current.solutionIds ?? []).filter((s) => s !== target.id)] };
  }
  if (child.level === "inspiration" && target.level === "product") return { kind: "basedOn", productId: child.id, baseId: target.id };
  return null;
}
