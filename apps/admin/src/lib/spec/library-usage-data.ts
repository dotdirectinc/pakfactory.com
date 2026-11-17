import { getLibraryProductTypeReview, listLibraryItems, listLibraryVersions, type LibraryItem } from "@/lib/spec/registry-api";
import type { SpecRefs } from "@/lib/spec/library-display";
import {
  LINE_KEYS,
  groupByLine,
  progressOf,
  reachedProductTypes,
  templateReach,
  type LineProductTypes,
  type ProductTypeProgress,
} from "@/lib/spec/library-usage";

/**
 * Reads for the two ways into the Spec Library review (PLAT-81), built from the existing list and
 * product type endpoints (no backend change): product types by line, each one's progress, and the
 * product types a shared template or capability reaches.
 */

const LIMIT = 100;

/** The product types of every line, at the given library versions, merged by line. */
export async function productTypesByLine(versions: readonly number[]): Promise<LineProductTypes[] | null> {
  const calls = LINE_KEYS.flatMap((line) =>
    versions.map(async (version) => {
      const res = await listLibraryItems(version, { collection: "product_type", line, limit: LIMIT, offset: 0 });
      return res.ok ? { line, items: res.data.items } : null;
    }),
  );
  const results = await Promise.all(calls);
  if (results.some((r) => r === null)) return null;
  const merged = new Map<string, LibraryItem[]>();
  for (const r of results) {
    const list = merged.get(r!.line) ?? [];
    for (const i of r!.items) if (!list.some((x) => x.sourceId === i.sourceId)) list.push(i);
    merged.set(r!.line, list);
  }
  return groupByLine([...merged.entries()].map(([line, items]) => ({ line, items })));
}

/** Each product type's progress over its group (product type, templates, capabilities); null if unreadable. */
export async function productTypeProgress(sourceIds: readonly string[]): Promise<Map<string, ProductTypeProgress | null>> {
  const results = await Promise.all(
    sourceIds.map(async (id) => {
      const res = await getLibraryProductTypeReview(id);
      return [id, res.ok ? progressOf(res.data) : null] as const;
    }),
  );
  return new Map(results);
}

/** The lines a capability applies to: the lines whose capability list holds it. */
async function capabilityLines(version: number, sourceId: string): Promise<string[] | null> {
  const results = await Promise.all(
    LINE_KEYS.map(async (line) => {
      const res = await listLibraryItems(version, { collection: "capability", line, search: sourceId, limit: LIMIT, offset: 0 });
      return res.ok ? (res.data.items.some((i) => i.sourceId === sourceId) ? line : "") : null;
    }),
  );
  if (results.some((r) => r === null)) return null;
  return results.filter((l) => !!l) as string[];
}

/**
 * The product types a template or capability reaches, by line. Null when it cannot be worked out
 * (another collection, an unreadable API, a template whose line or product type did not resolve).
 */
export async function reachOf(
  version: number,
  collection: string,
  sourceId: string,
  record: Record<string, unknown>,
  refs: SpecRefs | undefined,
): Promise<LineProductTypes[] | null> {
  if (collection !== "template" && collection !== "capability") return null;
  const versionsRes = await listLibraryVersions();
  if (!versionsRes.ok) return null;
  const groups = await productTypesByLine(versionsRes.data.map((v) => v.number));
  if (!groups) return null;
  if (collection === "capability") {
    const lines = await capabilityLines(version, sourceId);
    return lines ? reachedProductTypes(groups, { lines }) : null;
  }
  const reach = templateReach(record, refs);
  if (!reach) return null;
  if (reach.kind === "all") return groups;
  if (reach.kind === "line") return reachedProductTypes(groups, { lines: [reach.line] });
  return reachedProductTypes(groups, { productType: reach.sourceId });
}
