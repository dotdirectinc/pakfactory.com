import { loadRulesSource, type Loaded } from "./rules-source";
import type { TableKey } from "./catalog-table-model";

/**
 * What the rule editor shows for one record (PROD-2962): its current rules and the choices for its
 * pickers, from the same Sanity read the rules pages use. Only ACTIVE options take part in the rules
 * (the storefront's own filter), so a not-active option or one in a not-active type has no editor.
 */
export type Choice = { id: string; title: string; group: string };
export type RuleEditorData =
  | { kind: "product"; productId: string; offers: Choice[]; exceptions: (Choice & { mode: "add" | "remove"; reason: string })[];
      offerChoices: Choice[]; exceptionChoices: Choice[] }
  | { kind: "option"; optionId: string; typeId: string; typeSelects: "one" | "many"; compatible: Choice[]; choices: Choice[] }
  | { kind: "type"; typeId: string; decidedBy: "product" | "customization"; customerSelects: "one" | "many";
      groups: Choice[][]; choices: Choice[] }
  | { kind: "none"; reason: string };

export async function getRuleEditorData(key: TableKey, id: string): Promise<Loaded<RuleEditorData>> {
  if (key !== "product" && key !== "customizationOption" && key !== "customizationType") {
    return { ok: true, data: { kind: "none", reason: "This record has no customization rules of its own." } };
  }
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products, name } = res.data;
  const typeOf = new Map(catalog.types.map((t) => [t._id, t]));
  const optionChoice = (o: { _id: string; typeId: string }): Choice => ({ id: o._id, title: name(o._id), group: name(o.typeId) });
  const byTitle = (a: Choice, b: Choice) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title);

  if (key === "product") {
    const p = products.find((x) => x._id === id);
    if (!p) return { ok: true, data: { kind: "none", reason: "Only standard products list options; an inspiration product offers its base product's." } };
    const opt = new Map(catalog.options.map((o) => [o._id, o]));
    const offers = (p.availableCustomizations ?? []).map((a) => opt.get(a.optionId)).filter((o) => o).map((o) => optionChoice(o!)).sort(byTitle);
    const listed = new Set(offers.map((o) => o.id));
    return { ok: true, data: {
      kind: "product", productId: id, offers,
      exceptions: (p.customizationExceptions ?? []).map((e) => ({ ...optionChoice(opt.get(e.optionId) ?? { _id: e.optionId, typeId: "" }), mode: e.mode, reason: e.reason ?? "" })),
      offerChoices: catalog.options.filter((o) => typeOf.get(o.typeId)?.availabilityDecidedBy === "product" && !listed.has(o._id)).map(optionChoice).sort(byTitle),
      exceptionChoices: catalog.options.filter((o) => typeOf.get(o.typeId)?.availabilityDecidedBy === "customization").map(optionChoice).sort(byTitle),
    } };
  }

  if (key === "customizationOption") {
    const o = catalog.options.find((x) => x._id === id);
    if (!o) return { ok: true, data: { kind: "none", reason: "Not in the rules: no published option with this id." } };
    const partners = new Set<string>([...(o.compatibleCustomizations ?? [])]);
    for (const other of catalog.options) if ((other.compatibleCustomizations ?? []).includes(id)) partners.add(other._id);
    partners.delete(id);
    const t = typeOf.get(o.typeId);
    return { ok: true, data: {
      kind: "option", optionId: id, typeId: o.typeId, typeSelects: t?.customerSelects === "many" ? "many" : "one",
      compatible: [...partners].map((pid) => catalog.options.find((x) => x._id === pid)).filter(Boolean).map((x) => optionChoice(x!)).sort(byTitle),
      choices: catalog.options.filter((x) => x._id !== id && !partners.has(x._id)).map(optionChoice).sort(byTitle),
    } };
  }

  const t = typeOf.get(id);
  if (!t) return { ok: true, data: { kind: "none", reason: "This type is not part of the rules (not active, or not decided either way)." } };
  const typeChoice = (tid: string): Choice => ({ id: tid, title: name(tid), group: "Types" });
  const catChoice = (cid: string): Choice => ({ id: cid, title: name(cid), group: "Categories" });
  const cats = new Set((catalog.categories ?? []).map((c) => c._id));
  return { ok: true, data: {
    kind: "type", typeId: id, decidedBy: t.availabilityDecidedBy, customerSelects: t.customerSelects === "many" ? "many" : "one",
    groups: (t.requirements ?? []).map((g) => g.map((x) => (cats.has(x) ? catChoice(x) : typeChoice(x)))),
    choices: [...(catalog.categories ?? []).map((c) => catChoice(c._id)), ...catalog.types.filter((x) => x._id !== id).map((x) => typeChoice(x._id))],
  } };
}
