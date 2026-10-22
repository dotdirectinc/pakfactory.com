"use server";

import { fetchSpecMe } from "@/lib/spec/registry-api";
import { getCatalogRecord, type CatalogRecord } from "@/lib/spec/catalog-record";
import { loadRulesSource } from "@/lib/spec/rules-source";
import { getCustomizationView, getProductView } from "@/lib/spec/cached-views";
import { isTableKey } from "@/lib/spec/catalog-table-model";
import type { Loaded } from "@/lib/spec/rules-source";
import type { ProductOptionState } from "@/lib/spec/product-view";
import type { ProductException } from "@/lib/spec/rule-edits";

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
 * product's offered options, each with how it is offered (listed by the product, derived by the
 * rules, added by an exception), and an option's products. Other levels have none.
 */
export async function loadMapCompatible(
  level: string,
  id: string,
): Promise<Loaded<{
  products: string[];
  options: { id: string; state: ProductOptionState | "removed" }[];
  /** A derived option → the offered options that make it available (the rules' `derivedBecause`). */
  derivedFrom?: Record<string, string[]>;
  exceptions: ProductException[];
  /** An option: the options it is compatible with (either side records the pair). */
  compatibleOptions?: string[];
  /** An inspiration product: the product its offers come from, and what it pre-selects. */
  base?: { id: string; title: string };
  preselected?: string[];
}>> {
  if (!(await granted())) return { ok: false, error: "No access to Spec System" };
  let preset: { base: { id: string; title: string }; preselected: string[] } | null = null;
  if (level === "inspiration") {
    // No rules of its own: it offers what its base offers (2026-10-14), and pre-selects some of it.
    const src = await loadRulesSource();
    if (!src.ok) return src;
    const insp = src.data.inspirations.find((x) => x._id === id);
    if (!insp) return { ok: true, data: { products: [], options: [], exceptions: [] } };
    preset = { base: { id: insp.basedOn, title: src.data.name(insp.basedOn) }, preselected: insp.preselected };
  }
  if (level === "product" || preset) {
    const res = await getProductView(preset ? preset.base.id : id);
    if (!res.ok) return res;
    const types = (res.data?.categories ?? []).flatMap((c) => c.types);
    const options = [
      ...types.flatMap((t) => t.options.map((o) => ({ id: o.id, state: o.state }))),
      // Taken away by one of the product's exceptions: drawn as "Removed by exception", restorable.
      ...types.flatMap((t) => t.removed.filter((r) => r.byException).map((r) => ({ id: r.id, state: "removed" as const }))),
    ];
    const derivedFrom = Object.fromEntries(
      types.flatMap((t) => t.options.filter((o) => o.state === "derived").map((o): [string, string[]] => [o.id, [...new Set(o.because.flatMap((b) => b.partnerIds ?? []))]])),
    );
    return { ok: true, data: { products: [], options, derivedFrom, exceptions: res.data?.configurator.exceptions ?? [], ...(preset ?? {}) } };
  }
  if (level === "customizationOption") {
    const res = await getCustomizationView(id);
    if (!res.ok) return res;
    const src = await loadRulesSource();
    // Options the catalog knows, Not active ones included (2026-10-22): Not active only hides an option
    // on the site, so its pairs are still rules. A pair naming a deleted option is left out.
    const known = new Set(src.ok ? src.data.catalog.options.map((o) => o._id) : []);
    const compatibleOptions = src.ok
      ? [...new Set(src.data.catalog.options.flatMap((o) =>
          o._id === id ? (o.compatibleCustomizations ?? []) : (o.compatibleCustomizations ?? []).includes(id) ? [o._id] : []))]
          .filter((x) => x !== id && known.has(x))
      : [];
    return { ok: true, data: { products: (res.data?.offering ?? []).map((p) => p.id), options: [], exceptions: [], compatibleOptions } };
  }
  return { ok: true, data: { products: [], options: [], exceptions: [] } };
}
