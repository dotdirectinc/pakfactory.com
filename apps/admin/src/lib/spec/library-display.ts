/**
 * How a Spec Library record reads to a reviewer (PLAT-81): which fields are content and which are
 * bookkeeping, human labels for column names, ids and codes resolved to names, and a rule's logic as
 * sentences. Pure functions; the components in components/spec/library render what these return.
 */

/** A uuid or code resolved by the backend (`refs` on a record or on the held-changes list). */
export type SpecRef = { collection: string; sourceId: string; name: string | null };
export type SpecRefs = Record<string, SpecRef>;

/** Bookkeeping: shown folded under "Source and system", never among the content. */
export const SYSTEM_KEYS = new Set([
  "source_id", "source_keys", "source_version", "source_status", "source_updated_at", "source_updated_by",
  "created_at", "updated_at", "library_version",
  // Export form (held changes)
  "id", "version", "status", "updatedAt", "updatedBy", "verifiedAt", "verifiedBy",
]);

/** Fields that carry the record's meaning in a sentence: shown first, as text, not in the table. */
export const LEAD_KEYS = ["description", "message", "definition"] as const;

/** Short facts shown as badges under the title. */
export const FACT_KEYS = ["source_status", "verification", "type", "severity", "kind", "level", "availability", "data_type"] as const;

const LABELS: Record<string, string> = {
  data_type: "Data type",
  filled_by: "Filled by",
  option_source: "Options come from",
  default_value: "Default",
  default_override: "Default",
  group_id: "Group",
  section_id: "Section",
  category_id: "Category",
  product_type_id: "Product type",
  profile_id: "Regional material",
  family_id: "Family",
  region_id: "Region",
  grade_id: "Grade",
  capability_id: "Capability",
  name_zh: "Chinese name",
  local_name: "Local name",
  english_name: "English name",
  aliases_source: "Aliases",
  applicable_categories: "Applies to lines",
  allowed_caps: "Allowed options",
  allowed_values: "Allowed values",
  visible_when: "Visible when",
  required_when: "Required when",
  unit_from: "Unit from",
  data_source: "Data source",
  supplier_codes: "Supplier codes",
  technical_notes: "Technical notes",
  regionalRecords: "Regional records",
  regionalProfiles: "Regional materials",
  categoryStock: "Stock by line",
  categories: "Lines",
  sort: "Order",
};

/** A column or key name as a label: "group_id" → "Group", "applicableCategories" → "Applicable categories". */
export function labelOf(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const words = key
    .replace(/_id$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z]{2,4}-[A-Z0-9][A-Z0-9-]*$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isCode = (v: unknown): v is string => typeof v === "string" && CODE.test(v);
export const isIsoDate = (v: unknown): v is string => typeof v === "string" && ISO.test(v);

/** Nothing to show: null, blank text, an empty list or an empty object. */
export function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

export type ValueShape =
  | { kind: "empty" }
  | { kind: "bool"; value: boolean }
  | { kind: "text"; value: string }
  | { kind: "ref"; value: string }
  | { kind: "date"; value: string }
  | { kind: "chips"; values: unknown[] }
  | { kind: "map"; entries: [string, unknown][] }
  | { kind: "table"; columns: string[]; rows: Record<string, unknown>[] }
  | { kind: "json"; value: unknown };

const isScalar = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v);
const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Columns worth showing for a list of rows: keys with a value in at least one row, minus bookkeeping. */
export function tableColumns(rows: Record<string, unknown>[]): string[] {
  const seen: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
  return seen.filter((k) => !SYSTEM_KEYS.has(k) && k !== "sort" && rows.some((r) => !isEmpty(r[k])));
}

/** How to draw a value. */
export function shapeOf(v: unknown): ValueShape {
  if (isEmpty(v)) return { kind: "empty" };
  if (typeof v === "boolean") return { kind: "bool", value: v };
  if (typeof v === "number") return { kind: "text", value: String(v) };
  if (typeof v === "string") {
    if (isUuid(v) || isCode(v)) return { kind: "ref", value: v };
    if (isIsoDate(v)) return { kind: "date", value: v };
    return { kind: "text", value: v };
  }
  if (Array.isArray(v)) {
    if (v.every(isScalar)) return { kind: "chips", values: v };
    if (v.every(isPlainObject)) {
      const rows = v as Record<string, unknown>[];
      const columns = tableColumns(rows);
      if (columns.every((c) => rows.every((r) => isScalar(r[c]) || (Array.isArray(r[c]) && (r[c] as unknown[]).every(isScalar))))) {
        return { kind: "table", columns, rows };
      }
    }
    return { kind: "json", value: v };
  }
  if (isPlainObject(v)) {
    const entries = Object.entries(v).filter(([, x]) => !isEmpty(x));
    return entries.length === 0 ? { kind: "empty" } : { kind: "map", entries };
  }
  return { kind: "json", value: v };
}

/** The record's own fields, split into what a reviewer reads and what they rarely need. */
export function splitFields(record: Record<string, unknown>, skip: readonly string[] = []) {
  const lead: [string, string][] = [];
  const content: [string, unknown][] = [];
  const empty: string[] = [];
  const system: [string, unknown][] = [];
  for (const k of LEAD_KEYS) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) lead.push([k, v]);
  }
  for (const [k, v] of Object.entries(record)) {
    if (skip.includes(k) || (LEAD_KEYS as readonly string[]).includes(k) || k === "name" || k === "label") continue;
    if (SYSTEM_KEYS.has(k)) system.push([k, v]);
    else if (isEmpty(v)) empty.push(k);
    else content.push([k, v]);
  }
  const order = (k: string) => {
    const i = (FACT_KEYS as readonly string[]).indexOf(k);
    return i < 0 ? 100 : i;
  };
  content.sort(([a], [b]) => order(a) - order(b) || labelOf(a).localeCompare(labelOf(b)));
  empty.sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  return { lead, content, empty, system };
}

/** The record's title: its name or label, else its code. */
export function titleOf(record: Record<string, unknown>, fallback: string): string {
  for (const k of ["name", "label", "key"]) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}

// ── Rules ────────────────────────────────────────────────────────────────────

const OPS: Record<string, string> = {
  selected: "is selected",
  notSelected: "is not selected",
  not_selected: "is not selected",
  eq: "is",
  neq: "is not",
  ne: "is not",
  in: "is one of",
  notIn: "is not one of",
  not_in: "is not one of",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  exists: "is filled in",
  empty: "is empty",
  contains: "contains",
  between: "is between",
};

export function opLabel(op: unknown): string {
  return typeof op === "string" ? (OPS[op] ?? op) : "?";
}

export type RuleCondition = { subject: unknown; op: string; value: unknown; showValue: boolean };

/** A rule's `when` as a list of conditions joined by all/any. */
export function ruleConditions(body: unknown): { match: "all" | "any"; conditions: RuleCondition[] } | null {
  if (!isPlainObject(body) || !isPlainObject(body.when)) return null;
  const when = body.when;
  const list = Array.isArray(when.conditions) ? (when.conditions as unknown[]) : [];
  const conditions = list.filter(isPlainObject).map((c) => {
    const op = typeof c.op === "string" ? c.op : "";
    // "selected" names the option itself; there is no field to compare.
    const selectedOp = /selected/i.test(op);
    return {
      subject: selectedOp && isEmpty(c.field) ? c.value : c.field,
      op: opLabel(op),
      value: c.value,
      showValue: !(selectedOp && isEmpty(c.field)) && !["exists", "empty"].includes(op),
    };
  });
  return { match: when.match === "any" ? "any" : "all", conditions };
}

/** The parts of a rule body other than `when` that have something in them, labelled. */
export function ruleOutcomes(body: unknown): [string, unknown][] {
  if (!isPlainObject(body)) return [];
  const labels: Record<string, string> = {
    alternatives: "Suggest instead",
    requires: "Requires",
    assert: "Must hold",
    pairs: "Pairs",
    appliesTo: "Applies to",
  };
  return Object.entries(body)
    .filter(([k, v]) => k !== "when" && !isEmpty(v))
    .map(([k, v]) => [labels[k] ?? labelOf(k), v]);
}

/** Badge tone for a few well-known values. */
export function toneOf(key: string, value: unknown): "default" | "secondary" | "destructive" | "outline" | "warning" {
  const v = String(value).toLowerCase();
  if (key === "severity") return v === "error" || v === "block" ? "destructive" : v === "warning" ? "warning" : "secondary";
  if (key === "verification") return v === "verified" ? "default" : "warning";
  if (key === "source_status") return v === "active" ? "secondary" : "destructive";
  return "outline";
}
