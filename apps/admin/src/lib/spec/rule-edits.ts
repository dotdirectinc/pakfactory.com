import { buildCompatibilityIndex } from "@pakfactory/sanity/customization-rules";
import { buildDependencyGraph } from "@pakfactory/sanity/customization-rules/dependencies";
import { resolveForProduct } from "@pakfactory/sanity/customization-rules/resolve";
import type { SummaryCatalog, SummaryProduct } from "@pakfactory/sanity/customization-rules/summary";

/**
 * Rule edits made in the Spec System (PROD-2962, ADR-025), in SANITY ids — what the admin's rules
 * source is keyed by. The server action turns them into registry ids for POST /api/v1/rule-edits.
 *
 * Pure (no I/O): the edit kinds, a sentence for each, applying a set to an in-memory copy of the
 * catalog, and the IMPACT CHECK — the shared rules engine (the storefront's own) before and after,
 * per standard product, plus Studio's blocking errors and the warnings a person must acknowledge.
 */

export type RuleEditDraft =
  | { kind: "typeSettings"; typeId: string; decidedBy?: "product" | "customization"; customerSelects?: "one" | "many" }
  | { kind: "requirements"; typeId: string; groups: string[][] }
  | { kind: "pair"; a: string; b: string; compatible: boolean }
  | { kind: "offer"; productId: string; optionId: string; offered: boolean }
  | { kind: "exception"; productId: string; optionId: string; mode: "add" | "remove"; reason: string | null };

export type Names = (id: string) => string;

export function describeEdit(e: RuleEditDraft, name: Names): string {
  switch (e.kind) {
    case "typeSettings":
      return [
        e.decidedBy ? `${name(e.typeId)}: availability decided by ${e.decidedBy === "product" ? "each product" : "other customizations"}` : null,
        e.customerSelects ? `${name(e.typeId)}: customers pick ${e.customerSelects}` : null,
      ].filter(Boolean).join(" · ");
    case "requirements":
      return e.groups.length
        ? `${name(e.typeId)} depends on ${e.groups.map((g) => `(${g.map(name).join(" or ")})`).join(" and ")}`
        : `${name(e.typeId)} depends on nothing`;
    case "pair":
      return e.compatible ? `${name(e.a)} and ${name(e.b)} become compatible` : `${name(e.a)} and ${name(e.b)} are no longer compatible`;
    case "offer":
      return e.offered ? `${name(e.productId)} offers ${name(e.optionId)}` : `${name(e.productId)} no longer offers ${name(e.optionId)}`;
    case "exception":
      return e.reason === null
        ? `${name(e.productId)}: drop the "${e.mode}" exception for ${name(e.optionId)}`
        : `${name(e.productId)}: ${e.mode} ${name(e.optionId)} as an exception — "${e.reason}"`;
  }
}

/** Two edits that change the same thing: the later one replaces the earlier in the tray. */
export function editKey(e: RuleEditDraft): string {
  switch (e.kind) {
    case "typeSettings": return `type:${e.typeId}`;
    case "requirements": return `req:${e.typeId}`;
    case "pair": return `pair:${[e.a, e.b].sort().join("|")}`;
    case "offer": return `offer:${e.productId}:${e.optionId}`;
    case "exception": return `exc:${e.productId}:${e.optionId}`;
  }
}

/** The catalog and standard products with a set of edits applied (copies; the inputs are untouched). */
export function applyEdits(catalog: SummaryCatalog, products: SummaryProduct[], edits: RuleEditDraft[]) {
  const types = catalog.types.map((t) => ({ ...t, requirements: t.requirements?.map((g) => [...g]) }));
  const options = catalog.options.map((o) => ({ ...o, compatibleCustomizations: [...(o.compatibleCustomizations ?? [])] }));
  const prods = products.map((p) => ({
    ...p,
    availableCustomizations: [...(p.availableCustomizations ?? [])],
    customizationExceptions: [...(p.customizationExceptions ?? [])],
  }));
  const type = new Map(types.map((t) => [t._id, t]));
  const option = new Map(options.map((o) => [o._id, o]));
  const product = new Map(prods.map((p) => [p._id, p]));
  for (const e of edits) {
    if (e.kind === "typeSettings") {
      const t = type.get(e.typeId);
      if (!t) continue;
      if (e.decidedBy) t.availabilityDecidedBy = e.decidedBy;
      if (e.customerSelects) t.customerSelects = e.customerSelects;
    } else if (e.kind === "requirements") {
      const t = type.get(e.typeId);
      if (t) t.requirements = e.groups.map((g) => [...g]);
    } else if (e.kind === "pair") {
      const a = option.get(e.a);
      const b = option.get(e.b);
      if (!a || !b) continue;
      if (e.compatible) {
        if (!a.compatibleCustomizations.includes(b._id) && !b.compatibleCustomizations.includes(a._id)) a.compatibleCustomizations.push(b._id);
      } else {
        a.compatibleCustomizations = a.compatibleCustomizations.filter((x) => x !== b._id);
        b.compatibleCustomizations = b.compatibleCustomizations.filter((x) => x !== a._id);
      }
    } else if (e.kind === "offer") {
      const p = product.get(e.productId);
      if (!p) continue;
      p.availableCustomizations = p.availableCustomizations.filter((x) => x.optionId !== e.optionId);
      if (e.offered) p.availableCustomizations.push({ optionId: e.optionId });
    } else if (e.kind === "exception") {
      const p = product.get(e.productId);
      if (!p) continue;
      p.customizationExceptions = p.customizationExceptions.filter((x) => !(x.optionId === e.optionId && x.mode === e.mode));
      if (e.reason !== null) p.customizationExceptions.push({ optionId: e.optionId, mode: e.mode, reason: e.reason });
    }
  }
  return { catalog: { ...catalog, types, options }, products: prods };
}

export type ImpactProduct = { id: string; title: string; gained: string[]; lost: string[] };
export type ImpactWarning = { code: "loses-options" | "exception-redundant" | "exception-conflict" | "no-partners" | "type-switch"; text: string };
export type Impact = {
  errors: string[];
  warnings: ImpactWarning[];
  products: ImpactProduct[];
  totals: { products: number; gained: number; lost: number };
};

const offeredBy = (r: ReturnType<typeof resolveForProduct>) => new Set([...r.availableByType.values()].flat());

/**
 * What a set of edits does, with the storefront's own engine: every standard product resolved before
 * and after; the options each gains or loses; Studio's blocking rules; and the warnings to acknowledge.
 */
export function computeImpact(catalog: SummaryCatalog, products: SummaryProduct[], edits: RuleEditDraft[], name: Names): Impact {
  const errors = blockingErrors(catalog, products, edits, name);
  const after = applyEdits(catalog, products, edits);
  const resolveAll = (c: SummaryCatalog, ps: SummaryProduct[]) => {
    const graph = buildDependencyGraph(c);
    const index = buildCompatibilityIndex(c.options);
    return new Map(ps.map((p) => [p._id, resolveForProduct(c, p, graph, index)]));
  };
  const before = resolveAll(catalog, products);
  const later = resolveAll(after.catalog, after.products);

  const changed: ImpactProduct[] = [];
  const warnings: ImpactWarning[] = [];
  for (const p of products) {
    const b = offeredBy(before.get(p._id)!);
    const a = offeredBy(later.get(p._id)!);
    const gained = [...a].filter((x) => !b.has(x));
    const lost = [...b].filter((x) => !a.has(x));
    if (gained.length || lost.length) changed.push({ id: p._id, title: p.title ?? p._id, gained, lost });
    for (const ex of later.get(p._id)!.exceptions) {
      const was = before.get(p._id)!.exceptions.find((x) => x.optionId === ex.optionId && x.mode === ex.mode);
      if (was?.effect === ex.effect) continue;
      if (ex.effect === "redundant") warnings.push({ code: "exception-redundant", text: `${p.title ?? p._id}: the "${ex.mode}" exception for ${name(ex.optionId)} now does nothing — the rules already say the same.` });
      if (ex.effect === "conflict") warnings.push({ code: "exception-conflict", text: `${p.title ?? p._id}: ${name(ex.optionId)} is both added and removed — both exceptions are ignored.` });
    }
  }
  changed.sort((x, y) => y.lost.length - x.lost.length || y.gained.length - x.gained.length || x.title.localeCompare(y.title));
  const losers = changed.filter((c) => c.lost.length);
  if (losers.length) {
    const lost = losers.reduce((n, c) => n + c.lost.length, 0);
    warnings.unshift({ code: "loses-options", text: `${losers.length} ${losers.length === 1 ? "product loses" : "products lose"} ${lost} ${lost === 1 ? "option" : "options"} in total.` });
  }
  // An option left with no compatible partner is never derived anywhere (empty fails closed).
  const partnersAfter = buildCompatibilityIndex(after.catalog.options).pairs;
  const partnersBefore = buildCompatibilityIndex(catalog.options).pairs;
  for (const e of edits) {
    if (e.kind !== "pair" || e.compatible) continue;
    for (const id of [e.a, e.b]) {
      if ((partnersBefore.get(id)?.size ?? 0) > 0 && (partnersAfter.get(id)?.size ?? 0) === 0) {
        warnings.push({ code: "no-partners", text: `${name(id)} is left with no compatible options — it will not be offered where other customizations decide it.` });
      }
    }
  }
  for (const e of edits) {
    if (e.kind !== "typeSettings" || !e.decidedBy) continue;
    const t = catalog.types.find((x) => x._id === e.typeId);
    if (t && t.availabilityDecidedBy !== e.decidedBy) {
      warnings.push({ code: "type-switch", text: e.decidedBy === "customization"
        ? `${name(e.typeId)} switches to "decided by other customizations": products' own lists of these options stop counting.`
        : `${name(e.typeId)} switches to "decided by each product": these options are offered only where a product lists them, and exceptions on them stop counting.` });
    }
  }
  return {
    errors,
    warnings,
    products: changed,
    totals: { products: changed.length, gained: changed.reduce((n, c) => n + c.gained.length, 0), lost: changed.reduce((n, c) => n + c.lost.length, 0) },
  };
}

/** Studio's hard rules, in the admin's words (the server checks them again). */
export function blockingErrors(catalog: SummaryCatalog, products: SummaryProduct[], edits: RuleEditDraft[], name: Names): string[] {
  const errors: string[] = [];
  const settings = new Map(catalog.types.map((t) => [t._id, { decidedBy: t.availabilityDecidedBy, selects: t.customerSelects ?? "one" }]));
  for (const e of edits) if (e.kind === "typeSettings") {
    const s = settings.get(e.typeId);
    if (s) settings.set(e.typeId, { decidedBy: e.decidedBy ?? s.decidedBy, selects: e.customerSelects ?? s.selects });
  }
  const typeOf = new Map(catalog.options.map((o) => [o._id, o.typeId]));
  const productIds = new Set(products.map((p) => p._id));
  for (const e of edits) {
    if (e.kind === "pair") {
      if (e.a === e.b) errors.push(`${name(e.a)} cannot be compatible with itself.`);
      else if (e.compatible && typeOf.get(e.a) === typeOf.get(e.b) && settings.get(typeOf.get(e.a) ?? "")?.selects === "one") {
        errors.push(`${name(e.a)} and ${name(e.b)}: both are ${name(typeOf.get(e.a) ?? "")}, where customers pick one — they cannot be compatible.`);
      }
    } else if (e.kind === "offer") {
      if (!productIds.has(e.productId)) errors.push(`${name(e.productId)} is not a standard product.`);
      else if (e.offered && settings.get(typeOf.get(e.optionId) ?? "")?.decidedBy !== "product") {
        errors.push(`${name(e.productId)} / ${name(e.optionId)}: ${name(typeOf.get(e.optionId) ?? "")} is decided by other customizations — use an exception instead.`);
      }
    } else if (e.kind === "exception") {
      if (!productIds.has(e.productId)) errors.push(`${name(e.productId)} is not a standard product.`);
      else if (e.reason !== null && settings.get(typeOf.get(e.optionId) ?? "")?.decidedBy !== "customization") {
        errors.push(`${name(e.productId)} / ${name(e.optionId)}: ${name(typeOf.get(e.optionId) ?? "")} is listed per product — change the offered options instead.`);
      } else if (e.reason !== null && !e.reason.trim()) {
        errors.push(`${name(e.productId)} / ${name(e.optionId)}: an exception needs a reason.`);
      }
    } else if (e.kind === "requirements") {
      if (e.groups.some((g) => g.includes(e.typeId))) errors.push(`${name(e.typeId)} cannot depend on itself.`);
    }
  }
  return errors;
}

export type OfferState = "listed" | "derived" | "added";
export type RuleFocus = { level: "product" | "customizationOption"; id: string };
export type FocusAfter =
  | { level: "product"; id: string; options: { id: string; state: OfferState }[] }
  | { level: "customizationOption"; id: string; products: string[] };

/** What a product offers and how — the same naming as the product view (`product-view.ts`). */
export function offerStates(catalog: SummaryCatalog, product: SummaryProduct, graph = buildDependencyGraph(catalog), index = buildCompatibilityIndex(catalog.options)) {
  const r = resolveForProduct(catalog, product, graph, index);
  const added = new Set(r.exceptions.filter((e) => e.effect === "added").map((e) => e.optionId));
  const out = new Map<string, OfferState>();
  for (const type of catalog.types) {
    for (const id of r.availableByType.get(type._id) ?? []) {
      out.set(id, type.availabilityDecidedBy === "product" ? "listed" : added.has(id) ? "added" : "derived");
    }
  }
  return out;
}

/** The focused record after the edits: a product's offered options, or the products offering an option. */
export function focusAfter(catalog: SummaryCatalog, products: SummaryProduct[], edits: RuleEditDraft[], focus: RuleFocus): FocusAfter | null {
  const after = applyEdits(catalog, products, edits);
  if (focus.level === "product") {
    const p = after.products.find((x) => x._id === focus.id);
    if (!p) return null;
    return { level: "product", id: focus.id, options: [...offerStates(after.catalog, p)].map(([id, state]) => ({ id, state })) };
  }
  const option = after.catalog.options.find((o) => o._id === focus.id);
  if (!option) return null;
  const graph = buildDependencyGraph(after.catalog);
  const index = buildCompatibilityIndex(after.catalog.options);
  return {
    level: "customizationOption",
    id: focus.id,
    products: after.products.filter((p) => (resolveForProduct(after.catalog, p, graph, index).availableByType.get(option.typeId) ?? []).includes(focus.id)).map((p) => p._id),
  };
}

/** Enough of the catalog to turn "offer this option on this product" into the right edit. */
export type RuleMeta = {
  optionType: Record<string, string>;
  decidedBy: Record<string, "product" | "customization">;
  standard: string[];
  /** "productId|optionId" for each existing exception, by mode. */
  addExceptions: string[];
  removeExceptions: string[];
};

/**
 * The edit that makes `productId` offer (or stop offering) `optionId`, given what it does today.
 * Product-decided options are listed by the product; the others go through an exception, which
 * needs a reason (left empty here — the tray asks for it, and an empty one blocks submitting).
 * Returns null when the product cannot carry it (not a standard product, unknown option).
 */
export function offerEdit(meta: RuleMeta, productId: string, optionId: string, want: boolean): RuleEditDraft | null {
  if (!meta.standard.includes(productId)) return null;
  const decided = meta.decidedBy[meta.optionType[optionId] ?? ""];
  if (!decided) return null;
  if (decided === "product") return { kind: "offer", productId, optionId, offered: want };
  const pair = `${productId}|${optionId}`;
  if (want) {
    return meta.removeExceptions.includes(pair)
      ? { kind: "exception", productId, optionId, mode: "remove", reason: null }
      : { kind: "exception", productId, optionId, mode: "add", reason: "" };
  }
  return meta.addExceptions.includes(pair)
    ? { kind: "exception", productId, optionId, mode: "add", reason: null }
    : { kind: "exception", productId, optionId, mode: "remove", reason: "" };
}
