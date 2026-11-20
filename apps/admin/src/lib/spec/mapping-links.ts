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
type Row = { _id: string; _type: string; kind?: string | null; entityId: string; image?: string | null; status?: string | null; base?: string | null };
export type WebsiteRecord = { table: TableKey; id: string; image: string | null; status: string | null; base: string | null };

async function fetchIds(): Promise<Loaded<[string, WebsiteRecord][]>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  try {
    const rows = await client.fetch<Row[]>(
      `*[_type in ["product", "customizationOption", "propertyValue"] && defined(entityId)]{
        _id, _type, kind, entityId, status,
        // Inspiration products: the base standard product (PLAT-99), to borrow images for internal bases.
        "base": basedOn->entityId,
        // The first still, as catalog-record.ts picks it (PLAT-86 scope 6).
        "image": coalesce(coalesce(images[primary == true][0], images[0]).asset->url, featuredImage.asset->url, image.asset->url)
      }`,
    );
    const out: [string, WebsiteRecord][] = [];
    for (const r of rows) {
      const uuid = typeidToUuid(r.entityId)?.uuid;
      const table = tableOfDoc(r._type, r.kind);
      const base = r.base ? (typeidToUuid(r.base)?.uuid ?? null) : null;
      if (uuid && table) out.push([uuid, { table, id: r._id, image: r.image ?? null, status: r.status ?? null, base }]);
    }
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

const cachedIds = cachedSpec("mapping-registry-ids-v4", fetchIds);

/** Registry uuid → its catalog page and table; an empty lookup when Sanity cannot be read (links are a convenience). */
export async function websiteLinks(): Promise<Map<string, WebsiteRecord & { href: string }>> {
  const res = await cachedIds();
  if (!res.ok) return new Map();
  return new Map(res.data.map(([uuid, x]) => [uuid, { ...x, href: recordHref(x.table, x.id) }]));
}

