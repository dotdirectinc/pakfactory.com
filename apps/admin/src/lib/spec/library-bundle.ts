import type { LibraryBundleItem } from "@/lib/spec/registry-api";

/**
 * A product type reviewed with the records it is built from (PLAT-81): what is still open, what the
 * approve dialog ticks first, and how a selection is sent (one decision call per library version,
 * one decision row per record). Pure; the page and the dialog render what these return.
 */

export const keyOf = (i: Pick<LibraryBundleItem, "collection" | "sourceId">) => `${i.collection}/${i.sourceId}`;

/** Shared with other product types: approving it here approves it for all of them. */
export const isShared = (i: LibraryBundleItem) => i.sharedBy > 1;

/** Still open: never decided, or deferred. Approved and rejected records are not offered again. */
export const isOpen = (i: LibraryBundleItem) => i.state === "pending" || i.state === "defer";

/** What the approve dialog ticks first: the open records that belong to this product type only. */
export function defaultSelection(items: readonly LibraryBundleItem[]): Set<string> {
  return new Set(items.filter((i) => isOpen(i) && !isShared(i)).map(keyOf));
}

/** The selected records as decision calls, one per library version, in version order. */
export function decisionBatches(items: readonly LibraryBundleItem[], selected: ReadonlySet<string>) {
  const by = new Map<number, { collection: string; sourceId: string }[]>();
  for (const i of items) {
    if (!selected.has(keyOf(i)) || !isOpen(i)) continue;
    const list = by.get(i.version) ?? [];
    list.push({ collection: i.collection, sourceId: i.sourceId });
    by.set(i.version, list);
  }
  return [...by.entries()].sort(([a], [b]) => a - b).map(([version, list]) => ({ version, items: list }));
}

export type BundleSection = { key: string; title: string; items: LibraryBundleItem[] };

const TEMPLATE_LEVEL: Record<string, string> = { global: "All products", category: "Product line", type: "Product type" };
export const templateLevelLabel = (level: string | undefined) => TEMPLATE_LEVEL[level ?? ""] ?? level ?? "";

const COLLECTION_ORDER: Record<LibraryBundleItem["collection"], number> = { product_type: 0, template: 1, capability: 2 };
const LEVEL_ORDER: Record<string, number> = { global: 0, category: 1, type: 2 };
const groupSort = (i: LibraryBundleItem) => {
  const n = Number(i.group?.sort);
  return i.group?.sort == null || Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
};

/**
 * Display order (the backend returns the records unordered): the product type, its templates from
 * global to line to type, then capabilities by group sort (numeric, unsorted last), group name, code.
 */
export function sortBundle(items: readonly LibraryBundleItem[]): LibraryBundleItem[] {
  return [...items].sort(
    (a, b) =>
      COLLECTION_ORDER[a.collection] - COLLECTION_ORDER[b.collection] ||
      (LEVEL_ORDER[a.level ?? ""] ?? 9) - (LEVEL_ORDER[b.level ?? ""] ?? 9) ||
      (groupSort(a) === groupSort(b) ? 0 : groupSort(a) < groupSort(b) ? -1 : 1) ||
      (a.group?.name ?? "").localeCompare(b.group?.name ?? "") ||
      a.sourceId.localeCompare(b.sourceId),
  );
}

/** Product type, templates, then one section per capability group, in display order. */
export function bundleSections(items: readonly LibraryBundleItem[]): BundleSection[] {
  const out: BundleSection[] = [];
  const push = (key: string, title: string, i: LibraryBundleItem) => {
    let s = out.find((x) => x.key === key);
    if (!s) out.push((s = { key, title, items: [] }));
    s.items.push(i);
  };
  for (const i of sortBundle(items)) {
    if (i.collection === "product_type") push("product_type", "Product type", i);
    else if (i.collection === "template") push("template", "Templates", i);
    else push(`capability:${i.group?.sourceId ?? "none"}`, i.group?.name ?? "Other capabilities", i);
  }
  return out;
}

/** Counts by state, for the progress line. */
export function stateCounts(items: readonly LibraryBundleItem[]) {
  const c = { pending: 0, approve: 0, reject: 0, defer: 0 };
  for (const i of items) c[i.state] += 1;
  return c;
}
