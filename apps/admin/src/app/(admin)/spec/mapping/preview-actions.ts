"use server";

import { getLibraryRecord } from "@/lib/spec/registry-api";
import { getCatalogRecord } from "@/lib/spec/catalog-record";
import { isTableKey, levelOf } from "@/lib/spec/catalog-table-model";
import { collectionLabel } from "@/lib/spec/library-review";
import { FACT_KEYS, LEAD_KEYS, isEmpty, labelOf, titleOf } from "@/lib/spec/library-display";
import { requireRegistryGrant } from "@/lib/spec/require-grant";

/** What a hover card shows for one spec record: who it is, a sentence about it, and a few facts. */
export type SpecPreview = { title: string; code: string | null; kind: string; lead: string | null; facts: [string, string][]; image: string | null };
export type PreviewResult = { ok: true; data: SpecPreview } | { ok: false; error: string };

const short = (s: string, n = 280) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const text = (v: unknown): string | null =>
  typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : Array.isArray(v) && v.every((x) => typeof x === "string") ? v.join(", ") : null;

/** A production spec record (Spec Library), for the Mapping review hover card (PLAT-52). Read-only. */
export async function previewProductionAction(version: number, collection: string, sourceId: string): Promise<PreviewResult> {
  await requireRegistryGrant();
  const res = await getLibraryRecord(version, collection, sourceId);
  if (!res.ok) return { ok: false, error: res.error };
  const r = res.data.record;
  const lead = LEAD_KEYS.map((k) => text(r[k])).find((s) => s && s.trim()) ?? null;
  const refs = res.data.refs ?? {};
  const facts: [string, string][] = [];
  for (const k of [...FACT_KEYS, "category_id", "group_id", "unit", "default_value"]) {
    if (isEmpty(r[k])) continue;
    const raw = r[k];
    const ref = typeof raw === "string" ? refs[raw] : undefined;
    const v = ref ? (ref.name ?? ref.sourceId) : text(raw);
    if (v) facts.push([labelOf(k.replace(/_id$/, "")), short(v, 80)]);
    if (facts.length >= 6) break;
  }
  return {
    ok: true,
    data: { title: titleOf(r, sourceId), code: sourceId, kind: collectionLabel(collection), lead: lead ? short(lead) : null, facts, image: null },
  };
}

/** A website (customer) spec record (catalog), for the Mapping review hover card (PLAT-52). Read-only. */
export async function previewWebsiteAction(table: string, id: string): Promise<PreviewResult> {
  await requireRegistryGrant();
  if (!isTableKey(table)) return { ok: false, error: "unknown catalog table" };
  const res = await getCatalogRecord(table, id);
  if (!res.ok) return { ok: false, error: res.error };
  const rec = res.data;
  if (!rec) return { ok: false, error: "not published" };
  const facts: [string, string][] = [];
  let lead: string | null = null;
  for (const s of rec.sections) {
    if (s.key !== "overview" && s.key !== "structure") continue;
    for (const f of s.fields) {
      if (f.key === "title" || f.key === "slug" || f.key === "h1") continue;
      if (f.key === "shortDescription" || f.key === "description") {
        if (!lead && typeof f.text === "string") lead = short(f.text);
        continue;
      }
      const v = f.text != null ? String(f.text) : f.groups.flatMap((g) => g.items.map((i) => i.title)).join(", ");
      if (v) facts.push([f.label, short(v, 80)]);
      if (facts.length >= 6) break;
    }
  }
  if (rec.sku) facts.unshift(["SKU", rec.sku]);
  return {
    ok: true,
    data: { title: rec.title, code: rec.registry?.entityCode ?? null, kind: (() => { const e = levelOf(table)?.level.entity ?? table; return e[0]!.toUpperCase() + e.slice(1); })(), lead, facts: facts.slice(0, 7), image: rec.images[0] ?? null },
  };
}
