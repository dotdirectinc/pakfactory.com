/**
 * What Sync Changes applied with no frame (PROD-3118), said the way a reviewer reads it (PROD-3119):
 * "Status: active → not-active", "Slug: tray-and-sleeve-box → tray-sleeve-box", "Facts: thickness 0.25".
 */

/** A field the run can change, as a reviewer names it. */
const FIELD: Record<string, string> = {
  label: "Name",
  name: "Name",
  status: "Status",
  lifecycle: "Status",
  slug: "Slug",
  axis: "Solution type",
  facts: "Facts",
  kind_of_id: "Kind of",
};

type Fact = { label?: unknown; value?: unknown; shown?: unknown };

/** A field's value in words: facts as "label value" (internal ones left out), empty as "—". */
export function fieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "facts" && Array.isArray(value)) {
    const shown = (value as Fact[]).filter((f) => f?.shown !== false).map((f) => `${String(f.label)} ${String(f.value)}`);
    return shown.length ? shown.join(", ") : "—";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Each field that changed, "Field: old → new"; a field whose value did not change is left out. */
export function fieldChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  const keys = Object.keys(after ?? {}).filter((k) => k in FIELD);
  return keys
    .map((k) => ({ k, from: fieldValue(k, before?.[k]), to: fieldValue(k, after?.[k]) }))
    .filter(({ from, to }) => from !== to)
    .map(({ k, from, to }) => `${FIELD[k]}: ${from} → ${to}`);
}

export type AppliedItem = {
  entity_type: string;
  op: string;
  title: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

const LINKS = new Set(["option_property_value", "product_property_value"]);

/**
 * One applied change in a run's list. A property link's title is already "Record: value" (the server
 * names it so); a field change names its record and the fields.
 */
export function describeApplied(item: AppliedItem): { record: string; what: string } {
  if (LINKS.has(item.entity_type)) {
    const [record, ...value] = (item.title ?? "").split(": ");
    const v = value.join(": ") || "a property value";
    return { record: record || "A record", what: item.op === "retire" ? `Removed ${v}` : `Added ${v}` };
  }
  const changes = fieldChanges(item.before, item.after);
  return { record: item.title ?? "A record", what: changes.length ? changes.join(" · ") : "Updated" };
}
