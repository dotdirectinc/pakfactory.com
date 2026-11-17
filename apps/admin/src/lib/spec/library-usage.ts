import { DEFAULT_LINE, LINES, type LineKey } from "@/lib/spec/library-review";
import type { LibraryBundle, LibraryItem } from "@/lib/spec/registry-api";
import type { SpecRefs } from "@/lib/spec/library-display";

/**
 * Spec Library review (PLAT-81): the two ways in, and which product types a shared record reaches.
 * "By product type" is the default tab: one row per product type, opening the page that shows it with
 * its templates and capabilities. "All records" is the per-collection list. Pure; the pages fetch.
 */

export type LibraryView = "product-types" | "records";

/** A `collection` in the query means the per-collection list (older links have no `view`). */
export function viewOf(sp: { view?: string; collection?: string }): LibraryView {
  if (sp.view === "records") return "records";
  if (sp.view === "product-types") return "product-types";
  return sp.collection ? "records" : "product-types";
}

/** The "By product type" tab, keeping only what differs from the defaults. */
export function productTypesHref(q: { version?: number; line?: LineKey } = {}): string {
  const p = new URLSearchParams();
  if (q.version && q.version > 1) p.set("version", String(q.version));
  if (q.line && q.line !== DEFAULT_LINE) p.set("line", q.line);
  const s = p.toString();
  return s ? `/spec/library?${s}` : "/spec/library";
}

export const productTypeReviewHref = (sourceId: string) => `/spec/library/product-types/${encodeURIComponent(sourceId)}`;

/** The product lines a list call can filter by (every line except "all lines"). */
export const LINE_KEYS = LINES.filter((l) => l.key !== "all").map((l) => l.key);

export type ProductTypeProgress = { total: number; approve: number; open: number };

/** How far a product type's group is: approved, and still open (pending or deferred), of all its records. */
export function progressOf(bundle: Pick<LibraryBundle, "items">): ProductTypeProgress {
  let approve = 0;
  let open = 0;
  for (const i of bundle.items) {
    if (i.state === "approve") approve += 1;
    else if (i.state === "pending" || i.state === "defer") open += 1;
  }
  return { total: bundle.items.length, approve, open };
}

/**
 * Which product types a template reaches, from its stored level: a global template every product
 * type, a line template the product types of that line, a type template its one product type.
 */
export type TemplateReach = { kind: "all" } | { kind: "line"; line: string } | { kind: "product_type"; sourceId: string } | null;

export function templateReach(record: Record<string, unknown>, refs: SpecRefs | undefined): TemplateReach {
  const ref = (id: unknown) => (typeof id === "string" ? refs?.[id] : undefined);
  if (record.level === "global") return { kind: "all" };
  if (record.level === "category") {
    const r = ref(record.category_id);
    return r?.collection === "category" ? { kind: "line", line: r.sourceId } : null;
  }
  if (record.level === "type") {
    const r = ref(record.product_type_id);
    return r?.collection === "product_type" ? { kind: "product_type", sourceId: r.sourceId } : null;
  }
  return null;
}

export type LineProductTypes = { line: string; label: string; items: LibraryItem[] };

/** Product types grouped by line, in the line order of the review, dropping empty lines. */
export function groupByLine(byLine: { line: string; items: LibraryItem[] }[]): LineProductTypes[] {
  return LINE_KEYS.flatMap((key) => {
    const g = byLine.find((b) => b.line === key);
    if (!g || g.items.length === 0) return [];
    return [{ line: key, label: LINES.find((l) => l.key === key)!.label, items: g.items }];
  });
}

/** The product types a record reaches, given the lines it applies to (or one product type). */
export function reachedProductTypes(groups: readonly LineProductTypes[], reach: { lines: readonly string[] } | { productType: string }) {
  if ("productType" in reach) {
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.sourceId === reach.productType) }))
      .filter((g) => g.items.length > 0);
  }
  return groups.filter((g) => reach.lines.includes(g.line));
}
