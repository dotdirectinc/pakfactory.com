"use server";

import { fetchSpecMe } from "@/lib/spec/registry-api";
import { getCatalogRecord, type CatalogRecord } from "@/lib/spec/catalog-record";
import { getCustomizationView, getProductView } from "@/lib/spec/cached-views";
import { isTableKey } from "@/lib/spec/catalog-table-model";
import type { Loaded } from "@/lib/spec/rules-source";

/**
 * The Spec Map's side panel (PROD-2960). Read-only; the same grant as every Spec page, checked here
 * too because a server action is reachable on its own. Errors are returned, not thrown, so the
 * panel can say what went wrong.
 */
async function granted(): Promise<boolean> {
  const me = await fetchSpecMe();
  return Boolean(me?.authenticated && me.role);
}

/** The record the panel shows — the same data as its Catalog page. `null` = not found. */
export async function loadMapRecord(level: string, id: string): Promise<Loaded<CatalogRecord | null>> {
  if (!(await granted())) return { ok: false, error: "No access to Spec System" };
  if (!isTableKey(level)) return { ok: false, error: `Unknown level "${level}"` };
  return getCatalogRecord(level, id);
}

/**
 * What a record is compatible with, from the rules (the storefront's own answer): a standard
 * product's offered options, an option's products. Other levels have none.
 */
export async function loadMapCompatible(level: string, id: string): Promise<Loaded<{ products: string[]; options: string[] }>> {
  if (!(await granted())) return { ok: false, error: "No access to Spec System" };
  if (level === "product") {
    const res = await getProductView(id);
    if (!res.ok) return res;
    const options = (res.data?.categories ?? []).flatMap((c) => c.types.flatMap((t) => t.options.map((o) => o.id)));
    return { ok: true, data: { products: [], options } };
  }
  if (level === "customizationOption") {
    const res = await getCustomizationView(id);
    if (!res.ok) return res;
    return { ok: true, data: { products: (res.data?.offering ?? []).map((p) => p.id), options: [] } };
  }
  return { ok: true, data: { products: [], options: [] } };
}
