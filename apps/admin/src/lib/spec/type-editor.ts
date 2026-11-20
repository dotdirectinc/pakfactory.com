import type { SpecCollection, SpecEdit, SpecOwner } from "@/lib/spec/registry-api";

/**
 * The product type editor (PLAT-85 scope 4–5, ADR-028 D3, D5, D6). Pure; the page and actions fetch.
 *
 * An edit is a whole record in export shape. The editor changes a few fields of it and shows the
 * difference before saving; the server checks the record, then applies it (admin) or holds it as a
 * proposal (other roles).
 */

/** Bookkeeping keys the export carries but nobody edits; never shown as a change. */
const META = new Set(["updatedAt", "updatedBy", "version"]);

export type FieldChange = { key: string; before: unknown; after: unknown };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The top-level fields that differ between two versions of a record, in the order of `after`. */
export function recordChanges(before: Record<string, unknown> | null, after: Record<string, unknown>): FieldChange[] {
  const keys = [...new Set([...Object.keys(after), ...Object.keys(before ?? {})])].filter((k) => !META.has(k));
  return keys.filter((k) => !same(before?.[k], after[k])).map((k) => ({ key: k, before: before?.[k], after: after[k] }));
}

/** A value the editor treats as a number: digits with an optional sign and decimals. */
export function isNumberValue(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()));
}

export type Parameter = { key: string; label?: string; unit?: string; value: unknown };

/**
 * Apply edited parameter values. A value that was a number must stay a number (kept as the type it
 * was: number or numeric string). Returns the new list, or the errors by parameter key.
 */
export function withParameterValues(
  params: Parameter[],
  values: Record<string, string>,
): { ok: true; params: Parameter[] } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const out = params.map((p) => {
    if (!(p.key in values)) return p;
    const raw = values[p.key]!.trim();
    if (isNumberValue(p.value)) {
      if (!isNumberValue(raw)) {
        errors[p.key] = "must be a number";
        return p;
      }
      return { ...p, value: typeof p.value === "number" ? Number(raw) : raw };
    }
    return { ...p, value: raw };
  });
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, params: out };
}

/** A new capability in one line, in export shape (the fields Justin's export carries). */
export function newCapability(c: { id: string; name: string; groupId: string; line: string; description: string }) {
  return {
    id: c.id,
    name: c.name.trim(),
    groupId: c.groupId,
    applicableCategories: [c.line],
    description: c.description.trim(),
    aliases: [],
    constraints: [],
    options: [],
    parameters: [],
    status: "active",
    unit: "",
    verification: "illustrative",
  };
}

/** Words of a name for the id suggestion: letters and digits, at most three. */
export function idParts(name: string): string[] {
  return name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 3);
}

/**
 * Who may edit what (AC 6, AC 7): a collection the Spec System owns, and a person allowed to edit.
 * A collection still owned by the Spec Library export shows no Edit action.
 */
export function editRights(owners: Partial<Record<SpecCollection, SpecOwner>> | null, canEdit: boolean) {
  const owned = (c: SpecCollection) => canEdit && owners?.[c] === "spec_system";
  return { productTypes: owned("productTypes"), capabilities: owned("capabilities"), any: owned("productTypes") || owned("capabilities") };
}

/** The record edits for the given records (collection/sourceId keys), newest first. */
export function editsOf(items: SpecEdit[], keys: Set<string>): SpecEdit[] {
  return items.filter((e) => e.subject === "record" && e.collection && e.sourceId && keys.has(`${e.collection}/${e.sourceId}`));
}
