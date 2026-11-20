import type { MappingItem, MappingKind } from "@/lib/spec/registry-api";

/**
 * The map editor in Mapping review (PLAT-86, ADR-028 D4, D8). Pure; the panel and actions fetch.
 *
 * A map is a list of production targets (a product type, capability or field, each with an optional
 * setting) and presets (a label and value, tied to a capability or field, or stored only as text). An
 * edit sends the whole map back at the revision it started from; the database applies it and, for an
 * admin, approves the map. Another role's change to an approved map waits as a proposal.
 */

export type RefKind = "productType" | "capability" | "field";
export type Ref = { kind: RefKind; sourceId: string; name: string | null };

/** The map as the server stores it (`GET /spec-maps/:id/production`). */
export type MapDocTarget = { productType?: string; capability?: string; field?: string; setting?: string; revision?: number };
export type MapDocPreset = { label: string; value?: string; capability?: string; field?: string; raw?: string; revision?: number };
export type MapDoc = { targets: MapDocTarget[]; presets: MapDocPreset[]; revision: number };

export type DraftTarget = { ref: Ref; setting: string };
/** `ref` null: stored only as text ("needs a production code"); `raw` is that text. */
export type DraftPreset = { label: string; value: string; ref: Ref | null; raw: string | null };
export type MapDraft = { targets: DraftTarget[]; presets: DraftPreset[] };

const KIND_OF = { product_type: "productType", capability: "capability", field: "field" } as const;

/** The collection a picker searches (library-versions items) for each kind of record. */
export const LIBRARY_COLLECTION: Record<RefKind, "product_type" | "capability" | "field"> = {
  productType: "product_type",
  capability: "capability",
  field: "field",
};

/** What a map's main target may be: a website product maps to a product type; options and values to a capability or field. */
export function targetKinds(kind: MappingKind): RefKind[] {
  return kind === "product" ? ["productType"] : ["capability", "field"];
}

function refOf(x: { productType?: string; capability?: string; field?: string }, names: Map<string, string | null>): Ref | null {
  const kind = (["productType", "capability", "field"] as const).find((k) => x[k]);
  if (!kind) return null;
  const sourceId = x[kind]!;
  return { kind, sourceId, name: names.get(sourceId) ?? null };
}

/** The editable copy of a stored map. Names come from the review list, which already resolved them. */
export function draftOf(doc: MapDoc, item: Pick<MappingItem, "targets" | "presets">): MapDraft {
  const names = new Map<string, string | null>(item.targets.map((t) => [t.sourceId, t.name]));
  return {
    targets: doc.targets.flatMap((t) => {
      const ref = refOf(t, names);
      return ref ? [{ ref, setting: t.setting ?? "" }] : [];
    }),
    presets: doc.presets.map((p) => ({
      label: p.label,
      value: p.value ?? "",
      ref: refOf(p, names),
      raw: p.raw ?? null,
    })),
  };
}

/** A target as the review list shows it, for a name lookup when the stored map has only ids. */
export function refFromTarget(t: MappingItem["targets"][number]): Ref {
  return { kind: KIND_OF[t.kind], sourceId: t.sourceId, name: t.name };
}

const blank = (s: string) => s.trim() === "";

/** The body the server takes. Empty settings and values are left out; a preset given a record drops its old text. */
export function productionOf(d: MapDraft): { targets: MapDocTarget[]; presets: MapDocPreset[] } {
  return {
    targets: d.targets.map((t) => ({ [t.ref.kind]: t.ref.sourceId, ...(blank(t.setting) ? {} : { setting: t.setting.trim() }) })),
    presets: d.presets.map((p) => ({
      label: p.label.trim(),
      ...(blank(p.value) ? {} : { value: p.value.trim() }),
      ...(p.ref ? { [p.ref.kind]: p.ref.sourceId } : p.raw ? { raw: p.raw } : {}),
    })),
  };
}

/** What stops a save, by row: "target 1", "preset 2". */
export function draftErrors(d: MapDraft, kind: MappingKind): Record<string, string> {
  const errors: Record<string, string> = {};
  const allowed = targetKinds(kind);
  d.targets.forEach((t, i) => {
    if (!allowed.includes(t.ref.kind)) errors[`target ${i + 1}`] = `must be a ${allowed.map(nounOf).join(" or ")}`;
  });
  if (kind === "product" && d.targets.filter((t) => t.ref.kind === "productType").length > 1)
    errors.targets = "a website product maps to one product type";
  d.presets.forEach((p, i) => {
    if (blank(p.label)) errors[`preset ${i + 1}`] = "needs a label";
    else if (p.ref?.kind === "productType") errors[`preset ${i + 1}`] = "must be a capability or field";
  });
  return errors;
}

export function nounOf(k: RefKind): string {
  return k === "productType" ? "product type" : k;
}

const refText = (r: Ref | null, raw: string | null) => (r ? `${r.name ?? r.sourceId} (${r.sourceId})` : raw ? `text only: “${raw}”` : "no record");
const presetText = (p: { label: string; value: string }) => (p.value.trim() ? `${p.label.trim()} = ${p.value.trim()}` : p.label.trim());

export type MapChange = { kind: "added" | "removed" | "changed"; what: string; before?: string; after?: string };

/**
 * The difference a save makes, in words, for the review step. Targets compare by record; presets by
 * position, so a renamed or re-pointed preset shows as one change rather than a removal and an add.
 */
export function mapChanges(before: MapDraft, after: MapDraft): MapChange[] {
  const out: MapChange[] = [];
  const key = (t: DraftTarget) => `${t.ref.kind}/${t.ref.sourceId}`;
  const was = new Map(before.targets.map((t) => [key(t), t]));
  const now = new Map(after.targets.map((t) => [key(t), t]));
  const gone = [...was].filter(([k]) => !now.has(k)).map(([, t]) => t);
  const fresh = [...now].filter(([k]) => !was.has(k)).map(([, t]) => t);
  const withSetting = (t: DraftTarget) => refText(t.ref, null) + (t.setting.trim() ? ` = ${t.setting.trim()}` : "");
  // One record swapped for another of the same kind reads as a change, not a removal and an add.
  if (gone.length === 1 && fresh.length === 1 && gone[0]!.ref.kind === fresh[0]!.ref.kind) {
    out.push({ kind: "changed", what: `Target ${nounOf(fresh[0]!.ref.kind)}`, before: withSetting(gone[0]!), after: withSetting(fresh[0]!) });
    gone.length = 0;
    fresh.length = 0;
  }
  for (const t of gone) out.push({ kind: "removed", what: `Target ${nounOf(t.ref.kind)}`, before: withSetting(t) });
  for (const t of fresh) out.push({ kind: "added", what: `Target ${nounOf(t.ref.kind)}`, after: withSetting(t) });
  for (const [k, t] of now) {
    const b = was.get(k);
    if (!b) continue;
    else if (b.setting.trim() !== t.setting.trim())
      out.push({ kind: "changed", what: `Setting of ${t.ref.name ?? t.ref.sourceId}`, before: b.setting.trim() || "none", after: t.setting.trim() || "none" });
  }
  const n = Math.max(before.presets.length, after.presets.length);
  for (let i = 0; i < n; i++) {
    const b = before.presets[i];
    const a = after.presets[i];
    if (b && !a) out.push({ kind: "removed", what: "Preset", before: `${presetText(b)} · ${refText(b.ref, b.raw)}` });
    else if (a && !b) out.push({ kind: "added", what: "Preset", after: `${presetText(a)} · ${refText(a.ref, a.raw)}` });
    else if (a && b) {
      if (presetText(a) !== presetText(b)) out.push({ kind: "changed", what: `Preset ${i + 1}`, before: presetText(b), after: presetText(a) });
      if (a.ref?.sourceId !== b.ref?.sourceId || (!a.ref && a.raw !== b.raw))
        out.push({ kind: "changed", what: `Record of “${presetText(a)}”`, before: refText(b.ref, b.raw), after: refText(a.ref, a.raw) });
    }
  }
  return out;
}

/** A new product type in export shape (the fields Justin's export carries). Order 999 lists it last until someone sets it. */
export function newProductType(c: { id: string; name: string; line: string; description: string }) {
  const prefix = `PT-${c.line.replace(/^CAT-/, "")}-`;
  return {
    id: c.id,
    code: c.id.startsWith(prefix) ? c.id.slice(prefix.length) : c.id.replace(/^PT-/, ""),
    name: c.name.trim(),
    order: 999,
    status: "active",
    categoryId: c.line,
    description: c.description.trim(),
  };
}
