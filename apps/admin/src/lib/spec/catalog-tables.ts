import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
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
      client.fetch<{ props: string[] }[]>(`*[_type == "customizationType" && ${PUBLISHED}]{ "props": coalesce(properties[].property._ref, []) }`, {}, { cache: "no-store" }),
      client.fetch<{ title?: string; values: string[] }[]>(`*[_type == "customizationOption" && ${PUBLISHED}]{ title, "values": coalesce(properties[]._ref, []) }`, {}, { cache: "no-store" }),
    ]);
    for (const t of types) for (const pid of t.props) properties.add(pid);
    for (const o of options) for (const v of o.values) note(v, o.title ?? "");
  }
  const countKey = stream === "product" ? "usedByProducts" : "usedByOptions";
  const examplesKey = stream === "product" ? "productExamples" : "optionExamples";
  return values
    .filter((v) => used.has(v._id) || properties.has(String((v.property as { _ref?: string } | undefined)?._ref ?? "")))
    .map((v) => {
      const by = [...new Set(used.get(v._id) ?? [])].sort();
      return {
        ...v,
        [countKey]: by.length,
        [examplesKey]: by.length ? by.slice(0, EXAMPLES).join(", ") + (by.length > EXAMPLES ? ` +${by.length - EXAMPLES} more` : "") : null,
      };
    });
}

async function fetchTable(key: TableKey): Promise<Loaded<CatalogTable>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const spec = SPECS[key];
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  const image = spec.image ? `, "_image": ${spec.image}` : "";
  try {
    const docs =
      key === "productValue" || key === "optionValue"
        ? await propertyValueDocs(client, key === "productValue" ? "product" : "option")
        : await client.fetch<Doc[]>(
            `*[_type == $type && ${PUBLISHED}${spec.filter ? ` && ${spec.filter}` : ""}]{ ...${image} }`,
            { type: spec.type },
            { cache: "no-store" },
          );
    const refs = new Set<string>();
    for (const d of docs) for (const [k, v] of Object.entries(d)) if (!HIDDEN.has(k)) collectRefs(v, refs);
    const named = refs.size
      ? await client.fetch<{ _id: string; title?: string; label?: string; name?: string }[]>(
          `*[_id in $ids]{ _id, title, label, name }`,
          { ids: [...refs] },
          { cache: "no-store" },
        )
      : [];
    const names = new Map(named.map((n) => [n._id, n.title ?? n.label ?? n.name ?? n._id]));
    return { ok: true, data: buildCatalogTable(key, docs, names, RULES_DATASET) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

export const getCatalogTable = cachedSpec("catalog-table", fetchTable);
