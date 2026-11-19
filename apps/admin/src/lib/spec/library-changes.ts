import type { LibraryBundleItem, ProductTypeChangeItem } from "@/lib/spec/registry-api";

/**
 * A product type's changes (PLAT-85, ADR-028 D4/D7): the records that are new, changed or removed
 * since they were last approved, from the backend change list (PLAT-84). Pure; the pages fetch.
 *
 * Every listed record is decided on its own, but where the decision goes depends on why it is listed:
 *   edit      a proposal (PLAT-84) — decided by an admin on the proposal
 *   held      a change a new export makes to an approved record (PLAT-81) — decided on the held change
 *   record    a new record, or one edited without a proposal — a review decision on its library version
 */
export type ChangeRoute =
  | { kind: "edit"; edit: number }
  | { kind: "held"; item: number }
  | { kind: "record"; version: number; collection: LibraryBundleItem["collection"]; sourceId: string };

/** Change-list collections (export names) → review-bundle collections (table names). */
const BUNDLE: Record<ProductTypeChangeItem["collection"], LibraryBundleItem["collection"]> = {
  productTypes: "product_type",
  templates: "template",
  capabilities: "capability",
};

const keyOf = (collection: LibraryBundleItem["collection"], sourceId: string) => `${collection}/${sourceId}`;

/** Where each listed record's decision goes. A record missing from the bundle has no route (null). */
export function routeOf(item: ProductTypeChangeItem, bundle: Map<string, LibraryBundleItem>): ChangeRoute | null {
  if (item.edit) return { kind: "edit", edit: item.edit };
  if (item.changesetItem) return { kind: "held", item: item.changesetItem };
  const b = bundle.get(keyOf(BUNDLE[item.collection], item.sourceId));
  return b ? { kind: "record", version: b.version, collection: b.collection, sourceId: b.sourceId } : null;
}

export const bundleIndex = (items: LibraryBundleItem[]) => new Map(items.map((i) => [keyOf(i.collection, i.sourceId), i]));

export type ChangeRow = ProductTypeChangeItem & { route: ChangeRoute | null; recordHref: string | null };

export type ChangeGroups = Record<ProductTypeChangeItem["status"], ChangeRow[]>;

/** The listed records, grouped New / Changed / Removed, each with its route and record page. */
export function changeGroups(items: ProductTypeChangeItem[], bundle: LibraryBundleItem[]): ChangeGroups {
  const index = bundleIndex(bundle);
  const out: ChangeGroups = { new: [], changed: [], removed: [] };
  for (const i of items) {
    const b = index.get(keyOf(BUNDLE[i.collection], i.sourceId));
    out[i.status].push({
      ...i,
      route: routeOf(i, index),
      recordHref: b ? `/spec/library/${b.version}/${b.collection}/${encodeURIComponent(b.sourceId)}` : null,
    });
  }
  return out;
}

/** Who may decide a row: proposals only an admin (spec.admin); the rest anyone with spec.review. */
export function canDecideRow(route: ChangeRoute | null, me: { review: boolean; admin: boolean }): boolean {
  if (!route) return false;
  return route.kind === "edit" ? me.admin : me.review;
}

/** "Approve all listed": every row this person may decide, and how many of them are shared. */
export function approveAllPlan(groups: ChangeGroups, me: { review: boolean; admin: boolean }) {
  const rows = [...groups.new, ...groups.changed, ...groups.removed].filter((r) => canDecideRow(r.route, me));
  return { routes: rows.map((r) => r.route!), count: rows.length, shared: rows.filter((r) => r.sharedBy > 1).length };
}

/**
 * What Set as baseline will approve, mirroring the backend (spec_workflow.set_baseline): every new or
 * changed record with nothing open. Proposals, held changes and removals are skipped; they need their
 * own decision.
 */
export function baselinePlan(groups: ChangeGroups) {
  const all = [...groups.new, ...groups.changed, ...groups.removed];
  const approves = all.filter((r) => r.status !== "removed" && !r.edit && !r.changesetItem);
  return { records: approves.length, shared: approves.filter((r) => r.sharedBy > 1).length, skipped: all.length - approves.length };
}

/** Group record decisions by library version, one decision call each (as the bundle dialog does). */
export function recordBatches(routes: ChangeRoute[]) {
  const by = new Map<number, { collection: string; sourceId: string }[]>();
  for (const r of routes) {
    if (r.kind !== "record") continue;
    const list = by.get(r.version) ?? [];
    list.push({ collection: r.collection, sourceId: r.sourceId });
    by.set(r.version, list);
  }
  return [...by.entries()].sort(([a], [b]) => a - b).map(([version, items]) => ({ version, items }));
}
