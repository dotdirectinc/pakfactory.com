import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
import { HIDDEN, SPECS, buildCatalogTable, collectRefs, type CatalogTable, type Doc, type TableKey } from "./catalog-table-model";

export { TABLE_GROUPS, isTableKey } from "./catalog-table-model";
export type { CatalogColumn, CatalogRow, CatalogTable, TableGroup, TableKey } from "./catalog-table-model";

/** Catalog tables (PROD-2926): one published-Sanity read per table, built by catalog-table-model.ts. */
const PUBLISHED = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;

async function fetchTable(key: TableKey): Promise<Loaded<CatalogTable>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const spec = SPECS[key];
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  const image = spec.hasImages ? `, "_image": coalesce(images[primary == true][0], images[0], lifestyleImages[0]).asset->url` : "";
  try {
    const docs = await client.fetch<Doc[]>(
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
