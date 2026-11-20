import type { LibraryReviewState, MappingItem, MappingKind, MappingLabel, MappingTarget } from "@/lib/spec/registry-api";
import { DEFAULT_LINE, LINES, type LineKey } from "@/lib/spec/library-review";

/** Mapping review (PLAT-52): query parameters, links and grouping for the review page. */

export const KINDS: { key: MappingKind; label: string; groupBy: string }[] = [
  { key: "product", label: "Products", groupBy: "style" },
  { key: "option", label: "Options", groupBy: "category · type" },
  { key: "property_value", label: "Property values", groupBy: "property" },
];

export const MAP_STATES = [
  { key: "open", label: "To review" },
  { key: "approve", label: "Approved" },
  { key: "reject", label: "Rejected" },
  { key: "all", label: "All" },
] as const;
export type MapStateFilter = (typeof MAP_STATES)[number]["key"];

export const MAP_LABELS: { key: MappingLabel; label: string; hint: string }[] = [
  { key: "mapped", label: "Mapped", hint: "One clear production record; nothing extra to set." },
  { key: "mapped_with_preset", label: "Mapped with preset", hint: "Production record found; the website product also fixes some production values." },
  { key: "catch_all", label: "Catch-all", hint: "Only the line's custom structure fits: works for quoting, a dedicated type is needed for templates and vendor routing." },
  { key: "no_equivalent", label: "No equivalent", hint: "Nothing in the production library makes this today." },
];

export type MappingParams = { kind: MappingKind; line: LineKey; state: MapStateFilter; label: MappingLabel | null; search: string | null };

export function mappingParams(sp: { kind?: string; line?: string; state?: string; label?: string; search?: string }): MappingParams {
  return {
    kind: KINDS.some((k) => k.key === sp.kind) ? (sp.kind as MappingKind) : "product",
    // No "all lines" here: maps are loaded a line at a time.
    line: LINES.some((l) => l.key === sp.line && l.key !== "all") ? (sp.line as LineKey) : DEFAULT_LINE,
    state: MAP_STATES.some((s) => s.key === sp.state) ? (sp.state as MapStateFilter) : "open",
    label: MAP_LABELS.some((l) => l.key === sp.label) ? (sp.label as MappingLabel) : null,
    search: sp.search?.trim().slice(0, 100) || null,
  };
}

/** The page's URL, keeping only what differs from the defaults. */
export function mappingHref(p: Partial<MappingParams>): string {
  const q = new URLSearchParams();
  if (p.kind && p.kind !== "product") q.set("kind", p.kind);
  if (p.line && p.line !== DEFAULT_LINE) q.set("line", p.line);
  if (p.state && p.state !== "open") q.set("state", p.state);
  if (p.label) q.set("label", p.label);
  if (p.search) q.set("search", p.search);
  const s = q.toString();
  return s ? `/spec/mapping?${s}` : "/spec/mapping";
}

/** The state filter as the API takes it. */
export function apiState(s: MapStateFilter): string | undefined {
  return s === "all" ? undefined : s;
}

/** A production target's library record page. */
export function targetHref(t: Pick<MappingTarget, "kind" | "sourceId" | "version">): string {
  return `/spec/library/${t.version}/${t.kind}/${encodeURIComponent(t.sourceId)}`;
}

export function isOpenState(s: LibraryReviewState): boolean {
  return s === "pending" || s === "defer";
}

/**
 * Where a website record stands for customers, from its catalog status: on the website (active),
 * internal (active-internal: no page, can't be chosen, may still be the base of an inspiration
 * product), or anything else (not active, discontinued). Null when the catalog has no record.
 */
export type Visibility = "website" | "internal" | "other";
export function visibilityOf(status: string | null | undefined): Visibility | null {
  if (!status) return null;
  return status === "active" ? "website" : status === "active-internal" ? "internal" : "other";
}
const RANK: Record<Visibility, number> = { website: 0, internal: 1, other: 2 };

/**
 * Items grouped in the order the API sorted them (group, then name); a missing group comes last.
 * Records on the website come first, then internal ones, then the rest (2026-11-20): within a group,
 * and between groups (a group sorts by its best record, so an all-internal group follows the groups
 * customers can choose from). The API's order is kept among equals.
 */
export function groupMappings(
  items: MappingItem[],
  statusOf: (i: MappingItem) => string | null | undefined = () => null,
): { key: string; title: string | null; items: MappingItem[] }[] {
  const out = new Map<string, { key: string; title: string | null; items: MappingItem[] }>();
  for (const i of items) {
    const key = i.group ?? "";
    if (!out.has(key)) out.set(key, { key: key || "—", title: i.group, items: [] });
    out.get(key)!.items.push(i);
  }
  const rank = (i: MappingItem) => { const v = visibilityOf(statusOf(i)); return v ? RANK[v] : 0; };
  for (const g of out.values()) {
    // Stable: equal ranks keep the API's order.
    g.items = g.items.map((i, n) => ({ i, n })).sort((a, b) => rank(a.i) - rank(b.i) || a.n - b.n).map((x) => x.i);
  }
  // Groups: a group with any record on the website before one that is all internal, and so on
  // (its best rank); the API's order among equals; a missing group still last.
  const best = (g: { items: MappingItem[] }) => Math.min(...g.items.map(rank));
  return [...out.values()]
    .map((g, n) => ({ g, n, r: best(g) }))
    .sort((a, b) => (a.g.title === null ? 1 : 0) - (b.g.title === null ? 1 : 0) || a.r - b.r || a.n - b.n)
    .map((x) => x.g);
}

/** A target's setting as shown after its name: "= Outside only", or as written when it names its own field ("Grade = Anti-static"). */
export function settingText(setting: string): string {
  return setting.includes("=") ? setting : `= ${setting}`;
}
