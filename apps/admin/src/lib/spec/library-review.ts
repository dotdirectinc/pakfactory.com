import type { LibraryCollectionProgress, LibraryReviewState } from "@/lib/spec/registry-api";

/**
 * Spec Library review (PFP-124): the collections a reviewer works through, in the order they read
 * best — structure first, then capabilities and materials, then the form, then the rules.
 * The keys are the backend's (spec_production table names).
 */
export const LIBRARY_COLLECTIONS = [
  { key: "category", label: "Categories" },
  { key: "product_type", label: "Product types" },
  { key: "region", label: "Regions" },
  { key: "capability_group", label: "Capability groups" },
  { key: "capability", label: "Capabilities" },
  { key: "material_region_profile", label: "Regional materials" },
  { key: "material_grade", label: "Material grades" },
  { key: "material_stock", label: "Stock" },
  { key: "material_equivalence", label: "Equivalences" },
  { key: "section", label: "Sections" },
  { key: "field", label: "Fields" },
  { key: "template", label: "Templates" },
  { key: "rule", label: "Rules" },
  { key: "rule_test", label: "Rule examples" },
] as const;

export type LibraryCollection = (typeof LIBRARY_COLLECTIONS)[number]["key"];

export const STATE_FILTERS: readonly { key: LibraryReviewState | "all"; label: string }[] = [
  { key: "pending", label: "To review" },
  { key: "defer", label: "Deferred" },
  { key: "reject", label: "Rejected" },
  { key: "approve", label: "Approved" },
  { key: "all", label: "All" },
];

export const PAGE_SIZE = 100;

export function isCollection(v: unknown): v is LibraryCollection {
  return LIBRARY_COLLECTIONS.some((c) => c.key === v);
}

export function collectionLabel(key: string): string {
  return LIBRARY_COLLECTIONS.find((c) => c.key === key)?.label ?? key;
}

export function stateOf(v: unknown): LibraryReviewState | "all" {
  return STATE_FILTERS.some((s) => s.key === v) ? (v as LibraryReviewState | "all") : "pending";
}

export function pageOf(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** Totals over every collection of a version. "Open" = what still blocks approval: pending + deferred. */
export function totals(collections: readonly LibraryCollectionProgress[]) {
  const t = { total: 0, pending: 0, approve: 0, reject: 0, defer: 0 };
  for (const c of collections) {
    t.total += c.total;
    t.pending += c.pending;
    t.approve += c.approve;
    t.reject += c.reject;
    t.defer += c.defer;
  }
  return { ...t, open: t.pending + t.defer, decided: t.approve + t.reject };
}

/** A note is needed for a reject or a defer (the backend refuses one without). */
export function noteRequired(decision: "approve" | "reject" | "defer"): boolean {
  return decision !== "approve";
}

/** A query string for the review list, keeping only what differs from the defaults. */
export function listHref(q: { version: number; collection: string; state?: string; search?: string; page?: number }): string {
  const p = new URLSearchParams({ version: String(q.version), collection: q.collection });
  if (q.state && q.state !== "pending") p.set("state", q.state);
  if (q.search) p.set("search", q.search);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  return `/spec/library?${p}`;
}

/** A stored value as one line of text for the record view (objects and arrays as JSON). */
export function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}
