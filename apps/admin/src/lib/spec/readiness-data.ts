import {
  getLibraryProductTypeReview,
  listLibraryItems,
  listLibraryVersions,
  listSpecMappings,
  type LibraryReviewState,
  type MappingItem,
  type MappingKind,
} from "@/lib/spec/registry-api";
import {
  readinessOf,
  recordKey,
  type ProductTypeChain,
  type Readiness,
  type RecordRef,
} from "@/lib/spec/readiness";

/** The production collections a kind of map can resolve to. */
const COLLECTIONS: Record<MappingKind, string[]> = {
  product: ["product_type", "template", "capability"],
  option: ["capability", "field"],
  property_value: ["field", "capability"],
  inspiration: ["product_type", "template", "capability"],
};

const PAGE = 500;

/**
 * Every record's latest decision in the line's collections. A version lists the records it last
 * changed, so versions are read newest first and the first state seen for a record wins.
 */
async function libraryStates(
  line: string,
  collections: string[],
): Promise<
  | {
      ok: true;
      states: Map<string, LibraryReviewState>;
      versions: Map<string, number>;
    }
  | { ok: false; error: string }
> {
  const list = await listLibraryVersions(line);
  if (!list.ok) return { ok: false, error: list.error };
  const states = new Map<string, LibraryReviewState>();
  const versions = new Map<string, number>();
  for (const v of [...list.data].sort((a, b) => b.number - a.number)) {
    for (const collection of collections) {
      for (let offset = 0; ; offset += PAGE) {
        const res = await listLibraryItems(v.number, {
          collection,
          line,
          limit: PAGE,
          offset,
        });
        if (!res.ok) return { ok: false, error: res.error };
        for (const i of res.data.items) {
          const k = recordKey({ collection, sourceId: i.sourceId });
          if (!states.has(k)) {
            states.set(k, i.state);
            versions.set(k, v.number);
          }
        }
        if (offset + PAGE >= res.data.total) break;
      }
    }
  }
  return { ok: true, states, versions };
}

/** Each product type the maps point at, with its template chain (and their states, which include global templates). */
async function productTypeChains(
  items: MappingItem[],
  states: Map<string, LibraryReviewState>,
  versions: Map<string, number>,
): Promise<ProductTypeChain> {
  const ids = [
    ...new Set(
      items.flatMap((i) =>
        i.targets
          .filter((t) => t.kind === "product_type")
          .map((t) => t.sourceId),
      ),
    ),
  ];
  const chains: ProductTypeChain = new Map();
  await Promise.all(
    ids.map(async (id) => {
      const res = await getLibraryProductTypeReview(id);
      if (!res.ok) return; // the product type alone is checked
      const chain: RecordRef[] = res.data.items
        .filter(
          (i) => i.collection === "product_type" || i.collection === "template",
        )
        .sort((a, b) =>
          a.collection === b.collection
            ? 0
            : a.collection === "product_type"
              ? -1
              : 1,
        )
        .map((i) => ({
          collection: i.collection,
          sourceId: i.sourceId,
          // A template is named after what it covers ("All products", "Folding Cartons", the type itself).
          name:
            i.collection === "template"
              ? `Template: ${i.label ?? i.sourceId}`
              : i.label,
        }));
      for (const i of res.data.items) {
        const k = recordKey(i);
        if (!states.has(k)) {
          states.set(k, i.state);
          versions.set(k, i.version);
        }
      }
      chains.set(id, chain);
    }),
  );
  return chains;
}

export type ReadinessRow = { item: MappingItem; readiness: Readiness };

/** A production record's own page: its version, collection and source id (product types open their review page). */
export type RecordHrefs = Record<string, string>;

export async function loadReadiness(
  kind: MappingKind,
  line: string,
): Promise<
  | { ok: true; rows: ReadinessRow[]; hrefs: RecordHrefs }
  | { ok: false; error: string }
> {
  const [maps, lib] = await Promise.all([
    listSpecMappings({ kind, line }),
    libraryStates(line, COLLECTIONS[kind]),
  ]);
  if (!maps.ok) return { ok: false, error: maps.error };
  if (!lib.ok) return { ok: false, error: lib.error };
  const chains =
    kind === "product"
      ? await productTypeChains(maps.data.items, lib.states, lib.versions)
      : new Map();
  const rows = maps.data.items.map((item) => ({
    item,
    readiness: readinessOf(item, chains, (r) => lib.states.get(recordKey(r))),
  }));
  const hrefs: RecordHrefs = {};
  for (const r of rows.flatMap((x) => x.readiness.records)) {
    const k = recordKey(r);
    const v = lib.versions.get(k);
    if (r.collection === "product_type")
      hrefs[k] =
        `/spec/library/product-types/${encodeURIComponent(r.sourceId)}`;
    else if (v)
      hrefs[k] =
        `/spec/library/${v}/${r.collection}/${encodeURIComponent(r.sourceId)}`;
  }
  return { ok: true, rows, hrefs };
}
