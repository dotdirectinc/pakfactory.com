import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded, type RegistryIdentity } from "./rules-source";
import {
  HIDDEN,
  SPECS,
  collectRefs,
  recordFields,
  recordHref,
  tableOfDoc,
  type Doc,
  type RecordField,
  type RefInfo,
  type TableKey,
} from "./catalog-table-model";

/**
 * A catalog record's page (2026-10-08, Richard: every record at every level and status has one).
 * One published-Sanity read for the record and its references, and one per child list: what sits
 * under it in its stream (a solution's styles and inspiration products, a line's styles and
 * products…). Read-only, like the tables.
 */

export type ChildRow = { id: string; title: string; status: string | null; href: string };
export type ChildGroup = { label: string; rows: ChildRow[]; total: number };
export type CatalogRecord = {
  key: TableKey;
  id: string;
  title: string;
  status: string | null;
  registry?: RegistryIdentity;
  images: string[];
  rulesHref: string | null;
  fields: RecordField[];
  children: ChildGroup[];
  dataset: string;
};

const PUBLISHED = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const CHILD_LIMIT = 200;

type ChildQuery = { label: string; table: TableKey; groq: string };

/** What sits under a record, per level. `$id` is the record's Sanity id. */
const CHILDREN: Partial<Record<TableKey, ChildQuery[]>> = {
  productLine: [
    { label: "Product styles", table: "productStyle", groq: `_type == "productStyle" && productLine._ref == $id` },
    { label: "Standard products", table: "product", groq: `_type == "product" && kind != "inspiration" && productLine._ref == $id` },
  ],
  productStyle: [
    { label: "Standard products", table: "product", groq: `_type == "product" && kind != "inspiration" && $id in productStyle[]._ref` },
  ],
  product: [
    { label: "Inspiration products based on it", table: "inspiration", groq: `_type == "product" && kind == "inspiration" && basedOn._ref == $id` },
  ],
  customizationCategory: [
    { label: "Customization types", table: "customizationType", groq: `_type == "customizationType" && category._ref == $id` },
  ],
  customizationType: [
    { label: "Options", table: "customizationOption", groq: `_type == "customizationOption" && type._ref == $id` },
  ],
  solution: [
    { label: "Solution styles", table: "solutionStyle", groq: `_type == "solutionStyle" && solution._ref == $id` },
    { label: "Inspiration products", table: "inspiration", groq: `_type == "product" && kind == "inspiration" && $id in solutions[]._ref` },
  ],
  productValue: [
    { label: "Standard products using it", table: "product", groq: `_type == "product" && kind != "inspiration" && $id in properties[].values[]._ref` },
    { label: "Options using it", table: "customizationOption", groq: `_type == "customizationOption" && $id in properties[]._ref` },
  ],
  optionValue: [
    { label: "Options using it", table: "customizationOption", groq: `_type == "customizationOption" && $id in properties[]._ref` },
    { label: "Standard products using it", table: "product", groq: `_type == "product" && kind != "inspiration" && $id in properties[].values[]._ref` },
  ],
};

async function fetchRecord(key: TableKey, id: string): Promise<Loaded<CatalogRecord | null>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const spec = SPECS[key];
  const client = createClient({ projectId, dataset: RULES_DATASET, apiVersion: getSanityApiVersion(), useCdn: true, perspective: "published" });
  try {
    const doc = await client.fetch<(Doc & { _images?: (string | null)[] }) | null>(
      `*[_id == $id && _type == $type && ${PUBLISHED}][0]{
        ..., "_images": array::compact([
          // ADR-024: the primary product still first, then the other product stills, then lifestyle
          // stills; legacy featuredImage / media[] for documents not migrated yet; a value's image.
          coalesce(images[primary == true][0], images[0]).asset->url,
          ...coalesce(images[primary != true][].asset->url, []),
          ...coalesce(lifestyleImages[].asset->url, []),
          featuredImage.asset->url,
          ...coalesce(media[].asset->url, []),
          image.asset->url
        ])
      }`,
      { id, type: spec.type },
      { cache: "no-store" },
    );
    if (!doc) return { ok: true, data: null };

    const ids = new Set<string>();
    for (const [k, v] of Object.entries(doc)) if (!HIDDEN.has(k)) collectRefs(v, ids);
    const refDocs = ids.size
      ? await client.fetch<{ _id: string; _type: string; kind?: string; title?: string; label?: string; name?: string; term?: string }[]>(
          `*[_id in $ids]{ _id, _type, kind, title, label, name, term }`,
          { ids: [...ids] },
          { cache: "no-store" },
        )
      : [];
    const refs = new Map<string, RefInfo>(
      refDocs.map((r) => {
        const t = tableOfDoc(r._type, r.kind);
        return [r._id, { title: r.title ?? r.label ?? r.name ?? r.term ?? r._id, href: t ? recordHref(t, r._id) : null }];
      }),
    );

    const children = await Promise.all(
      (CHILDREN[key] ?? []).map(async (c) => {
        const res = await client.fetch<{ total: number; rows: { _id: string; title?: string; status?: string }[] }>(
          `{ "total": count(*[${c.groq} && ${PUBLISHED}]),
             "rows": *[${c.groq} && ${PUBLISHED}] | order(title asc) [0...${CHILD_LIMIT}] { _id, title, status } }`,
          { id },
          { cache: "no-store" },
        );
        return {
          label: c.label,
          total: res.total,
          rows: res.rows.map((r) => ({ id: r._id, title: r.title ?? r._id, status: r.status ?? null, href: recordHref(c.table, r._id) })),
        };
      }),
    );

    const entityId = typeof doc.entityId === "string" ? doc.entityId : undefined;
    const entityCode = typeof doc.entityCode === "string" ? doc.entityCode : undefined;
    return {
      ok: true,
      data: {
        key,
        id,
        title: String(doc.title ?? id),
        status: typeof doc.status === "string" ? doc.status : null,
        ...(entityId && entityCode ? { registry: { entityId, entityCode } } : {}),
        images: (doc._images ?? []).filter((u): u is string => Boolean(u)),
        rulesHref: spec.rules ? spec.rules(doc) : null,
        fields: recordFields(doc, refs),
        children: children.filter((c) => c.total > 0),
        dataset: RULES_DATASET,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

export const getCatalogRecord = cachedSpec("catalog-record", fetchRecord);
