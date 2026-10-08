import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
import { getProductRows } from "./cached-views";
import { ADMIN_SPEC_RULES_COPY as RULES_COPY } from "@/lib/copy/spec";
import { HIDDEN, SPECS, buildCatalogTable, collectRefs, type CatalogTable, type Doc, type TableKey } from "./catalog-table-model";

export { TABLE_GROUPS, isTableKey } from "./catalog-table-model";
export type { CatalogColumn, CatalogRow, CatalogTable, TableGroup, TableKey } from "./catalog-table-model";

/** Catalog tables (PROD-2926): one published-Sanity read per table, built by catalog-table-model.ts. */
const PUBLISHED = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;

type Client = ReturnType<typeof createClient>;
const EXAMPLES = 5;

/**
 * The fourth level of the Products and Customizations streams (2026-10-08): property values, with
 * the stream's usage. Products use a property by listing it (`properties[].property`, with the values
 * they state); customization types declare properties for their options, and options point at values.
 * A value is listed when its property is used by the stream, or when the stream uses the value itself.
 */
async function propertyValueDocs(client: Client, stream: "product" | "option"): Promise<Doc[]> {
  const values = await client.fetch<Doc[]>(`*[_type == "propertyValue" && ${PUBLISHED}]{ ... }`, {}, { cache: "no-store" });
  const used = new Map<string, string[]>();
  const properties = new Set<string>();
  /** Option stream: per property, the customization types that declare it and how. */
  const declaredOn = new Map<string, string[]>();
  const note = (valueId: string, title: string) => used.set(valueId, [...(used.get(valueId) ?? []), title]);
  if (stream === "product") {
    const products = await client.fetch<{ title?: string; p: { property?: string; values: string[] }[] }[]>(
      `*[_type == "product" && kind != "inspiration" && ${PUBLISHED} && count(properties) > 0]{
        title, "p": properties[]{ "property": property._ref, "values": coalesce(values[]._ref, []) } }`,
      {}, { cache: "no-store" },
    );
    for (const pr of products) for (const row of pr.p ?? []) {
      if (row.property) properties.add(row.property);
      for (const v of row.values) note(v, pr.title ?? "");
    }
  } else {
    const [types, options] = await Promise.all([
      client.fetch<{ title?: string; decl: { property?: string; usage?: string; shown?: boolean }[] }[]>(
        `*[_type == "customizationType" && ${PUBLISHED}]{ title, "decl": coalesce(properties[]{ "property": property._ref, usage, "shown": showOnDetailPage }, []) }`,
        {}, { cache: "no-store" },
      ),
      client.fetch<{ title?: string; values: string[] }[]>(`*[_type == "customizationOption" && ${PUBLISHED}]{ title, "values": coalesce(properties[]._ref, []) }`, {}, { cache: "no-store" }),
    ]);
    for (const t of types) {
      for (const d of t.decl) {
        if (!d.property) continue;
        properties.add(d.property);
        // Same wording as the retired Properties page: a stated property not shown on the page is "hidden".
        const usage = d.usage === "stated" && d.shown === false ? "hidden" : (d.usage ?? "stated");
        declaredOn.set(d.property, [...(declaredOn.get(d.property) ?? []), `${t.title ?? "?"} (${usage})`]);
      }
    }
    for (const o of options) for (const v of o.values) note(v, o.title ?? "");
  }
  const countKey = stream === "product" ? "usedByProducts" : "usedByOptions";
  const examplesKey = stream === "product" ? "productExamples" : "optionExamples";
  return values
    .filter((v) => used.has(v._id) || properties.has(String((v.property as { _ref?: string } | undefined)?._ref ?? "")))
    .map((v) => {
      const by = [...new Set(used.get(v._id) ?? [])].sort();
      const declared = declaredOn.get(String((v.property as { _ref?: string } | undefined)?._ref ?? ""));
      return {
        ...v,
        ...(declared ? { declaredOn: [...declared].sort().join(", ") } : {}),
        [countKey]: by.length,
        [examplesKey]: by.length ? by.slice(0, EXAMPLES).join(", ") + (by.length > EXAMPLES ? ` +${by.length - EXAMPLES} more` : "") : null,
      };
    });
}

/**
 * Standard products with what the rules make of them (2026-10-08): listed and derived options and
 * exceptions, from the same cached rules summary as the product's rules view. A product the rules
 * cannot read keeps the columns empty; a rules failure leaves the table itself working.
 */
async function withRuleCounts(docs: Doc[]): Promise<Doc[]> {
  const res = await getProductRows();
  if (!res.ok) return docs;
  const byId = new Map(res.data.rows.map((r) => [r.id, r]));
  return docs.map((d) => {
    const r = byId.get(d._id);
    return r ? { ...d, rulesListed: r.listed, rulesDerived: r.derived, rulesExceptions: r.exceptions } : d;
  });
}

/**
 * What the retired Customizations page showed and the documents do not hold as one field
 * (2026-10-08): per type, how many properties it declares and who decides availability, in words;
 * per option, how many property values it has.
 */
function withCustomizationCounts(key: TableKey, docs: Doc[]): Doc[] {
  if (key === "customizationType") {
    return docs.map((d) => ({
      ...d,
      declaredProperties: Array.isArray(d.properties) ? d.properties.length : 0,
      ...(d.availabilityDecidedBy === "product" || d.availabilityDecidedBy === "customization"
        ? { availabilityDecidedBy: RULES_COPY.decidedBy[d.availabilityDecidedBy] }
        : {}),
    }));
  }
  if (key === "customizationOption") {
    return docs.map((d) => ({ ...d, valueCount: Array.isArray(d.properties) ? d.properties.length : 0 }));
  }
  return docs;
}

async function fetchTable(key: TableKey): Promise<Loaded<CatalogTable>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const spec = SPECS[key];
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  const image = spec.image ? `, "_image": ${spec.image}` : "";
  try {
    const read =
      key === "productValue" || key === "optionValue"
        ? await propertyValueDocs(client, key === "productValue" ? "product" : "option")
        : await client.fetch<Doc[]>(
            `*[_type == $type && ${PUBLISHED}${spec.filter ? ` && ${spec.filter}` : ""}]{ ...${image} }`,
            { type: spec.type },
            { cache: "no-store" },
          );
    const docs = key === "product" ? await withRuleCounts(read) : withCustomizationCounts(key, read);
    const refs = new Set<string>();
    for (const d of docs) for (const [k, v] of Object.entries(d)) if (!HIDDEN.has(k)) collectRefs(v, refs);
    const named = refs.size
      ? await client.fetch<{ _id: string; title?: string; label?: string; name?: string; term?: string }[]>(
          `*[_id in $ids]{ _id, title, label, name, term }`,
          { ids: [...refs] },
          { cache: "no-store" },
        )
      : [];
    const names = new Map(named.map((n) => [n._id, n.title ?? n.label ?? n.name ?? n.term ?? n._id]));
    return { ok: true, data: buildCatalogTable(key, docs, names, RULES_DATASET) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

export const getCatalogTable = cachedSpec("catalog-table", fetchTable);
