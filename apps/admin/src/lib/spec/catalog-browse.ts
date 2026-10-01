import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded, type RegistryIdentity } from "./rules-source";
import { studioEditUrl } from "./studio-link";

/**
 * The Customizations and Properties browsers (Spec System). Every category, type, option,
 * property and value as Sanity holds it — including options the rules leave out (not active) —
 * with its registry id and where each property is used. Read-only, like the rest of Spec System:
 * edits happen in Studio.
 *
 * One lean read of the same dataset the rules pages use (`RULES_DATASET`), counted here rather
 * than in GROQ: a `references()` subquery per value would scan the dataset ~900 times.
 */

export const BROWSE_QUERY = /* groq */ `{
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]
    | order(coalesce(orderRank, title) asc) { _id, title, entityId, entityCode },
  "types": *[_type == "customizationType" && !(_id in path("drafts.**"))]
    | order(coalesce(orderRank, title) asc) {
      _id, title, entityId, entityCode, availabilityDecidedBy, customerSelects,
      "categoryId": category._ref,
      "declarations": coalesce(properties[]{ "propertyId": property._ref, usage, showOnDetailPage }, [])
    },
  "options": *[_type == "customizationOption" && !(_id in path("drafts.**"))]
    | order(coalesce(orderRank, title) asc) {
      _id, title, entityId, entityCode, status,
      "typeId": type._ref,
      "valueIds": coalesce(properties[]._ref, [])
    },
  "properties": *[_type == "property" && !(_id in path("drafts.**"))] | order(title asc) {
    _id, title, entityId, entityCode
  },
  "values": *[_type == "propertyValue" && !(_id in path("drafts.**"))] | order(title asc) {
    _id, title, entityId, entityCode,
    "propertyId": property._ref,
    "kindOf": kindOf->title,
    "facts": coalesce(facts[]{ label, "value": coalesce(text, string(value)) }, [])
  },
  "productProperties": *[_type == "product" && !(_id in path("drafts.**")) && count(properties) > 0]{
    "rows": properties[]{ "propertyId": property._ref, "valueIds": coalesce(values[]._ref, []) }
  }.rows
}`;

type Identity = Partial<RegistryIdentity>;
export type BrowseResult = {
  categories: ({ _id: string; title?: string } & Identity)[];
  types: ({
    _id: string;
    title?: string;
    availabilityDecidedBy?: string;
    customerSelects?: string;
    categoryId?: string;
    declarations: { propertyId?: string; usage?: string; showOnDetailPage?: boolean | null }[];
  } & Identity)[];
  options: ({ _id: string; title?: string; status?: string; typeId?: string; valueIds: string[] } & Identity)[];
  properties: ({ _id: string; title?: string } & Identity)[];
  values: ({
    _id: string;
    title?: string;
    propertyId?: string;
    kindOf?: string;
    facts: { label?: string; value?: string }[];
  } & Identity)[];
  productProperties: ({ propertyId?: string; valueIds: string[] }[] | null)[];
};

const registryOf = (d: Identity): RegistryIdentity | undefined =>
  d.entityId && d.entityCode ? { entityId: d.entityId, entityCode: d.entityCode } : undefined;
const withRegistry = (d: Identity) => (registryOf(d) ? { registry: registryOf(d) } : {});

async function fetchBrowse(): Promise<Loaded<BrowseResult>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const client = createClient({
    projectId,
    dataset: RULES_DATASET,
    apiVersion: getSanityApiVersion(),
    useCdn: true,
    perspective: "published",
  });
  try {
    return { ok: true, data: await client.fetch<BrowseResult>(BROWSE_QUERY, {}, { cache: "no-store" }) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

const push = <T>(m: Map<string, T[]>, key: string, row: T) => m.set(key, [...(m.get(key) ?? []), row]);

// ─── Customizations ─────────────────────────────────────────────────────────

export type BrowseOption = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  status: string;
  /** Only active options are in the rules, so only they have a rules page. */
  hasRulesPage: boolean;
  valueCount: number;
};
export type BrowseType = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  decidedBy?: string;
  customerSelects?: string;
  declaredProperties: number;
  studioUrl: string | null;
  options: BrowseOption[];
};
export type BrowseCategory = { id: string; title: string; registry?: RegistryIdentity; types: BrowseType[] };
export type CustomizationTree = {
  dataset: string;
  categories: BrowseCategory[];
  totals: { categories: number; types: number; options: number; registered: number };
};

export const getCustomizationTree = cachedSpec(
  "browse-customizations",
  async (): Promise<Loaded<CustomizationTree>> => {
    const res = await fetchBrowse();
    return res.ok ? { ok: true, data: buildCustomizationTree(res.data) } : res;
  },
);

export function buildCustomizationTree({ categories, types, options }: BrowseResult): CustomizationTree {
  const optionsByType = new Map<string, BrowseOption[]>();
  for (const o of options) {
    push(optionsByType, o.typeId ?? "", {
      id: o._id,
      title: o.title ?? o._id,
      ...withRegistry(o),
      status: o.status ?? "—",
      hasRulesPage: o.status === "active",
      valueCount: o.valueIds.length,
    });
  }
  const typesByCategory = new Map<string, BrowseType[]>();
  for (const t of types) {
    push(typesByCategory, t.categoryId ?? "", {
      id: t._id,
      title: t.title ?? t._id,
      ...withRegistry(t),
      ...(t.availabilityDecidedBy ? { decidedBy: t.availabilityDecidedBy } : {}),
      ...(t.customerSelects ? { customerSelects: t.customerSelects } : {}),
      declaredProperties: t.declarations.length,
      studioUrl: studioEditUrl("customizationType", t._id),
      options: optionsByType.get(t._id) ?? [],
    });
  }
  const tree: BrowseCategory[] = categories.map((c) => ({
    id: c._id,
    title: c.title ?? c._id,
    ...withRegistry(c),
    types: typesByCategory.get(c._id) ?? [],
  }));
  // Types without a known category still show, so nothing in the dataset is hidden.
  const known = new Set(categories.map((c) => c._id));
  const orphans = [...typesByCategory].filter(([id]) => !known.has(id)).flatMap(([, ts]) => ts);
  if (orphans.length) tree.push({ id: "", title: "No category", types: orphans });

  return {
    dataset: RULES_DATASET,
    categories: tree,
    totals: {
      categories: categories.length,
      types: types.length,
      options: options.length,
      registered: [...categories, ...types, ...options].filter((d) => registryOf(d)).length,
    },
  };
}

// ─── Properties ─────────────────────────────────────────────────────────────

export type BrowseValue = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  kindOf?: string;
  facts: { label: string; value: string }[];
  options: number;
  products: number;
};
export type BrowseProperty = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  /** Types that declare it, with how ("stated", "selectable"; "hidden" when not shown). */
  declaredOn: { type: string; usage: string }[];
  products: number;
  values: BrowseValue[];
};
export type PropertyList = {
  dataset: string;
  properties: BrowseProperty[];
  totals: { properties: number; values: number; registered: number };
};

export const getPropertyList = cachedSpec("browse-properties", async (): Promise<Loaded<PropertyList>> => {
  const res = await fetchBrowse();
  return res.ok ? { ok: true, data: buildPropertyList(res.data) } : res;
});

export function buildPropertyList({ types, options, properties, values, productProperties }: BrowseResult): PropertyList {
  const count = (m: Map<string, number>, id?: string) => {
    if (id) m.set(id, (m.get(id) ?? 0) + 1);
  };
  const optionsPerValue = new Map<string, number>();
  for (const o of options) for (const v of new Set(o.valueIds)) count(optionsPerValue, v);
  const productsPerValue = new Map<string, number>();
  const productsPerProperty = new Map<string, number>();
  for (const rows of productProperties) {
    for (const r of rows ?? []) {
      count(productsPerProperty, r.propertyId);
      for (const v of new Set(r.valueIds)) count(productsPerValue, v);
    }
  }
  const declaredOn = new Map<string, { type: string; usage: string }[]>();
  for (const t of types) {
    for (const d of t.declarations) {
      if (!d.propertyId) continue;
      const usage = d.usage === "stated" && d.showOnDetailPage === false ? "hidden" : (d.usage ?? "stated");
      push(declaredOn, d.propertyId, { type: t.title ?? t._id, usage });
    }
  }
  const valuesByProperty = new Map<string, BrowseValue[]>();
  for (const v of values) {
    push(valuesByProperty, v.propertyId ?? "", {
      id: v._id,
      title: v.title ?? v._id,
      ...withRegistry(v),
      ...(v.kindOf ? { kindOf: v.kindOf } : {}),
      facts: v.facts.flatMap((f) => (f.label && f.value ? [{ label: f.label, value: f.value }] : [])),
      options: optionsPerValue.get(v._id) ?? 0,
      products: productsPerValue.get(v._id) ?? 0,
    });
  }

  return {
    dataset: RULES_DATASET,
    properties: properties.map((p) => ({
      id: p._id,
      title: p.title ?? p._id,
      ...withRegistry(p),
      declaredOn: (declaredOn.get(p._id) ?? []).sort((a, b) => a.type.localeCompare(b.type)),
      products: productsPerProperty.get(p._id) ?? 0,
      values: valuesByProperty.get(p._id) ?? [],
    })),
    totals: {
      properties: properties.length,
      values: values.length,
      registered: [...properties, ...values].filter((d) => registryOf(d)).length,
    },
  };
}
