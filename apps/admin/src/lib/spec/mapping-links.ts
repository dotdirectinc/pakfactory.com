import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded } from "./rules-source";
import { recordHref, tableOfDoc, type TableKey } from "./catalog-table-model";
import { typeidToUuid } from "./typeid";

/**
 * Mapping review (PLAT-52): the website (customer) side of a map is a Registry entity; its page in
 * admin is the catalog record of the Sanity document that carries that entity's id. One small read
 * of every published product, option and property value that has a Registry id, cached like the
 * other Spec views (60 s).
 */
type Row = { _id: string; _type: string; kind?: string | null; entityId: string };

async function fetchIds(): Promise<Loaded<[string, { table: TableKey; id: string }][]>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  try {
    const rows = await client.fetch<Row[]>(
      `*[_type in ["product", "customizationOption", "propertyValue"] && defined(entityId)]{ _id, _type, kind, entityId }`,
    );
    const out: [string, { table: TableKey; id: string }][] = [];
    for (const r of rows) {
      const uuid = typeidToUuid(r.entityId)?.uuid;
      const table = tableOfDoc(r._type, r.kind);
      if (uuid && table) out.push([uuid, { table, id: r._id }]);
    }
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

const cachedIds = cachedSpec("mapping-registry-ids-v1", fetchIds);

/** Registry uuid → its catalog page and table; an empty lookup when Sanity cannot be read (links are a convenience). */
export async function websiteLinks(): Promise<Map<string, { href: string; table: TableKey; id: string }>> {
  const res = await cachedIds();
  if (!res.ok) return new Map();
  return new Map(res.data.map(([uuid, x]) => [uuid, { ...x, href: recordHref(x.table, x.id) }]));
}
