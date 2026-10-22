"use server";

import { revalidatePath, updateTag } from "next/cache";
import { checkRuleEdits, fetchSpecMe, getChangesetDetail, listAllChangesets, listDraftChangesets, submitRuleEdits, type RegistryMove, type RegistryRuleEdit, type RuleEditResult } from "@/lib/spec/registry-api";
import { loadRulesSource, type Loaded, type RulesSource } from "@/lib/spec/rules-source";
import { SPEC_RULES_TAG } from "@/lib/spec/cache";
import { computeImpact, focusAfter, isMove, type MoveDraft, type FocusAfter, type Impact, type RuleEditDraft, type RuleFocus, type RuleMeta } from "@/lib/spec/rule-edits";
import { getRuleEditorData, type Choice, type RuleEditorData } from "@/lib/spec/rule-editor-data";
import { isTableKey } from "@/lib/spec/catalog-table-model";
import { typeidToUuid } from "@/lib/spec/typeid";
import { pendingRulesOf, type PendingRules } from "@/lib/spec/pending-rules";

/**
 * Rule editing in the Spec System (PROD-2962, ADR-025). Server actions so the access token stays on
 * the server and the grant is the backend's (value.approve: approvers and admins). Errors are
 * returned, never thrown, so the editor can show them.
 */
async function canEdit(): Promise<boolean> {
  const me = await fetchSpecMe();
  return Boolean(me?.authenticated && me.capabilities?.includes("value.approve"));
}

export async function loadRuleEditor(level: string, id: string): Promise<Loaded<RuleEditorData & { canEdit: boolean }>> {
  if (!isTableKey(level)) return { ok: false, error: `Unknown level "${level}"` };
  const [data, allowed] = await Promise.all([getRuleEditorData(level, id), canEdit()]);
  return data.ok ? { ok: true, data: { ...data.data, canEdit: allowed } } : data;
}

export type Preview = Impact & {
  names: Record<string, string>;
  /** One sentence per edit, in the edits' order. */
  sentences: string[];
  /** The focused record after the edits — what the Spec Map draws as the preview. */
  focus: FocusAfter | null;
  /**
   * When the set moves records (PROD-3007): the server's own check — what moves with each move, and the
   * codes it would reissue. Its refusals are in `errors`.
   */
  structure: { sentences: string[]; codes: { id: string; name: string; code: string }[]; documents: number } | null;
  /**
   * Products the moves take to another line or base without an accepted new SKU (backend 20261022200000),
   * by Sanity id: each needs one before the set can be submitted.
   */
  skusNeeded: { id: string; name: string; sku: string; why: string }[];
};

/** New SKUs the person typed, by product Sanity id → registry id for the backend. */
function skusToRegistry(skus: Record<string, string>, src: RulesSource) {
  const out: Record<string, string> = {};
  for (const [id, sku] of Object.entries(skus)) {
    const u = typeidToUuid(src.identity(id)?.entityId)?.uuid;
    if (u && sku.trim()) out[u] = sku.trim();
  }
  return out;
}

/** Sanity ids → registry ids (each document's entityId TypeID), for the backend. */
function toRegistry(edits: RuleEditDraft[], src: RulesSource) {
  const missing: string[] = [];
  const reg = (id: string) => {
    const u = typeidToUuid(src.identity(id)?.entityId)?.uuid;
    if (!u) missing.push(src.name(id));
    return u ?? "";
  };
  const cats = new Set((src.catalog.categories ?? []).map((c) => c._id));
  const rules: RegistryRuleEdit[] = [];
  const moves: RegistryMove[] = [];
  for (const e of edits) {
    switch (e.kind) {
      case "typeSettings": rules.push({ kind: e.kind, typeId: reg(e.typeId), ...(e.decidedBy ? { decidedBy: e.decidedBy } : {}), ...(e.customerSelects ? { customerSelects: e.customerSelects } : {}) }); break;
      case "requirements": rules.push({ kind: e.kind, typeId: reg(e.typeId), groups: e.groups.map((g) => g.map((x) => (cats.has(x) ? { categoryId: reg(x) } : { typeId: reg(x) }))) }); break;
      case "pair": rules.push({ kind: e.kind, a: reg(e.a), b: reg(e.b), compatible: e.compatible }); break;
      case "offer": rules.push({ kind: e.kind, productId: reg(e.productId), optionId: reg(e.optionId), offered: e.offered }); break;
      case "exception": rules.push({ kind: e.kind, productId: reg(e.productId), optionId: reg(e.optionId), mode: e.mode, reason: e.reason }); break;
      case "placement": moves.push({ kind: "productPlacement", productId: reg(e.productId), lineId: reg(e.lineId), styleIds: e.styleIds.map(reg) }); break;
      case "styleLine": moves.push({ kind: e.kind, styleId: reg(e.styleId), lineId: reg(e.lineId) }); break;
      case "basedOn": moves.push({ kind: e.kind, productId: reg(e.productId), baseId: reg(e.baseId) }); break;
      case "solutions": moves.push({ kind: e.kind, productId: reg(e.productId), solutionIds: e.solutionIds.map(reg) }); break;
      case "optionType": moves.push({ kind: e.kind, optionId: reg(e.optionId), typeId: reg(e.typeId) }); break;
      case "typeCategory": moves.push({ kind: e.kind, typeId: reg(e.typeId), categoryId: reg(e.categoryId) }); break;
      case "solutionStyleSolution": moves.push({ kind: e.kind, styleId: reg(e.styleId), solutionId: reg(e.solutionId) }); break;
    }
  }
  return { rules, moves, missing: [...new Set(missing)] };
}

/**
 * The impact check: the storefront's own engine before and after, per standard product; and, for
 * the record in focus, what it offers (or who offers it) once the edits apply.
 */
export async function previewRuleEdits(edits: RuleEditDraft[], focus?: RuleFocus | null, skus: Record<string, string> = {}): Promise<Loaded<Preview>> {
  if (!(await canEdit())) return { ok: false, error: "Editing rules needs an approver or admin grant." };
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products, name, inspirations, dataset } = res.data;
  const impact = computeImpact(catalog, products, edits, name, inspirations);
  const ids = new Set([...impact.products.flatMap((p) => [...p.gained, ...p.lost])]);
  // Moves: the server checks them (PROD-3006 has the rules and knows what hangs under each record).
  let structure: Preview["structure"] = null;
  let skusNeeded: Preview["skusNeeded"] = [];
  if (edits.some(isMove)) {
    const body = toRegistry(edits, res.data);
    if (body.missing.length) impact.errors.push(`Not registered yet: ${body.missing.join(", ")}.`);
    else {
      const r = await checkRuleEdits({ dataset, edits: body.rules, moves: body.moves, skus: skusToRegistry(skus, res.data) });
      if (r.ok) {
        const codes = r.data.codes.map((c) => {
          const id = res.data.fromRegistry(c.id);
          return { id: id ?? c.id, name: id ? name(id) : c.id, code: c.code };
        });
        structure = { sentences: r.data.sentences, codes, documents: r.data.documents };
      } else if (r.status === 404) {
        impact.errors.push("This server cannot check moves yet (it needs the rule-edits check route). Nothing can be submitted.");
      } else {
        // A product needing a new SKU is asked for in the SKU box, not listed as an error.
        skusNeeded = (r.skusNeeded ?? []).map((x) => {
          const id = res.data.fromRegistry(x.productId);
          return { id: id ?? x.productId, name: id ? name(id) : x.name, sku: x.sku, why: x.why };
        });
        const asked = new Set((r.skusNeeded ?? []).map((x) => `${x.name} (${x.sku}) ${x.why}.`));
        for (const e of r.errors ?? [r.error]) if (!asked.has(e) && !impact.errors.includes(e)) impact.errors.push(e);
      }
    }
  }
  return {
    ok: true,
    data: {
      ...impact,
      structure,
      skusNeeded,
      names: Object.fromEntries([...ids].map((id) => [id, name(id)])),
      // Effect-first ("offers Flocking again — drops the remove exception"); see computeImpact.
      focus: focus ? focusAfter(catalog, products, edits, focus) : null,
    },
  };
}

/** Whether this person may edit, and what the diagram needs to pick the right edit for "offer this here". */
export async function loadRuleMeta(): Promise<Loaded<{ canEdit: boolean; meta: RuleMeta | null }>> {
  if (!(await canEdit())) return { ok: true, data: { canEdit: false, meta: null } };
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products } = res.data;
  const exceptions = (mode: "add" | "remove") =>
    products.flatMap((p) => (p.customizationExceptions ?? []).filter((e) => e.mode === mode).map((e) => `${p._id}|${e.optionId}`));
  return {
    ok: true,
    data: {
      canEdit: true,
      meta: {
        optionType: Object.fromEntries(catalog.options.map((o) => [o._id, o.typeId])),
        decidedBy: Object.fromEntries(catalog.types.map((t) => [t._id, t.availabilityDecidedBy])),
        standard: products.map((p) => p._id),
        addExceptions: exceptions("add"),
        removeExceptions: exceptions("remove"),
      },
    },
  };
}

export type SubmitResult = { ok: true; data: RuleEditResult } | { ok: false; error: string; errors?: string[] };

/** Submit (a frame for approval) or Submit & approve. Refused if the impact check has blocking errors. */
export async function submitRuleEditsAction(edits: RuleEditDraft[], opts: { approve: boolean; note?: string; skus?: Record<string, string> }): Promise<SubmitResult> {
  if (!(await canEdit())) return { ok: false, error: "Editing rules needs an approver or admin grant." };
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products, name, dataset, inspirations } = res.data;
  const impact = computeImpact(catalog, products, edits, name, inspirations);
  if (impact.errors.length) return { ok: false, error: impact.errors[0]!, errors: impact.errors };

  const body = toRegistry(edits, res.data);
  if (body.missing.length) return { ok: false, error: `Not registered yet: ${body.missing.join(", ")}.` };

  const r = await submitRuleEdits({
    dataset, edits: body.rules, ...(body.moves.length ? { moves: body.moves, skus: skusToRegistry(opts.skus ?? {}, res.data) } : {}), approve: opts.approve, note: opts.note,
    impact: {
      totals: impact.totals,
      warnings: impact.warnings.map((w) => w.text),
      products: impact.products.slice(0, 50).map((p) => ({ title: p.title, gained: p.gained.map(name), lost: p.lost.map(name) })),
      // What the frame page shows for this edit, and what a record's own history finds it by.
      sentences: impact.sentences,
      records: [...new Set(edits.flatMap(recordsOf))],
    },
  });
  if (!r.ok) return { ok: false, error: r.error, ...(r.errors ? { errors: r.errors } : {}) };
  // The rules views read Sanity; an approved edit changed it (updateTag: this person sees it at once).
  if (r.data.state === "approved") updateTag(SPEC_RULES_TAG);
  revalidatePath("/spec");
  return { ok: true, data: r.data };
}

/** The records an edit is about, by Sanity id — for a record's "Recent rule edits". */
function recordsOf(e: RuleEditDraft): string[] {
  switch (e.kind) {
    case "typeSettings":
    case "requirements": return [e.typeId];
    case "pair": return [e.a, e.b];
    case "offer":
    case "exception": return [e.productId, e.optionId];
    // A move is about the record and the parents it leaves and joins (the new ones are named here).
    case "placement": return [e.productId, e.lineId, ...e.styleIds];
    case "styleLine": return [e.styleId, e.lineId];
    case "basedOn": return [e.productId, e.baseId];
    case "solutions": return [e.productId, ...e.solutionIds];
    case "optionType": return [e.optionId, e.typeId];
    case "typeCategory": return [e.typeId, e.categoryId];
    case "solutionStyleSolution": return [e.styleId, e.solutionId];
  }
}

export type RecordEdit = { id: string; state: string; at: string; sentence: string; more: number };

/**
 * A record's recent rule edits (feedback 2026-10-14: after Submit & approve there was no way back to the
 * frame, and no way to see a rule had already been changed). Frames from before 2026-10-14 carry no
 * record list, so they are matched by the record's name in their sentences.
 */
export async function loadRecordEdits(id: string, title: string): Promise<Loaded<RecordEdit[]>> {
  if (!(await canEdit())) return { ok: true, data: [] };
  const res = await listAllChangesets();
  if (!res.ok) return { ok: false, error: res.error };
  const out = res.data
    .filter((c) => c.source === "spec-edit")
    .filter((c) => {
      const impact = (c.summary?.impact ?? {}) as { records?: string[] };
      if (Array.isArray(impact.records)) return impact.records.includes(id);
      const sentences = Array.isArray(c.summary?.sentences) ? (c.summary.sentences as string[]) : [];
      return sentences.some((x) => x.includes(title));
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((c) => {
      const impact = (c.summary?.impact ?? {}) as { sentences?: string[] };
      const sentences = impact.sentences ?? (Array.isArray(c.summary?.sentences) ? (c.summary.sentences as string[]) : []);
      return { id: c.id, state: c.state, at: c.approved_at ?? c.created_at, sentence: sentences[0] ?? c.frame, more: Math.max(0, sentences.length - 1) };
    });
  return { ok: true, data: out };
}

/**
 * The record's rule fields with a change waiting for approval (PROD-2962 scope 4), from the waiting
 * Spec System frames' own items. Anyone who can see the rules sees what is waiting; a failed read
 * marks nothing rather than blocking the rules.
 */
export async function loadPendingRules(id: string): Promise<Loaded<PendingRules>> {
  const res = await listDraftChangesets();
  if (!res.ok) return { ok: false, error: res.error };
  const frames = res.data.filter((c) => c.source === "spec-edit");
  const details = await Promise.all(frames.map((c) => getChangesetDetail(c.id)));
  return {
    ok: true,
    data: pendingRulesOf(id, details.flatMap((d) => (d.ok ? [{ id: d.data.id, created_at: d.data.created_at, items: d.data.items }] : []))),
  };
}

/** A record's parents and what they can become (PROD-3007), from the same read as the rules. */
export type ParentsData = {
  canEdit: boolean;
  kind: "standard" | "inspiration" | "style" | "option" | "type" | "line" | "category" | "solution" | "solutionStyle" | "none";
  current: { lineId?: string; styleIds?: string[]; baseId?: string; solutionIds?: string[]; solutionId?: string; typeId?: string; categoryId?: string };
  choices: {
    lines: Choice[];
    styles: (Choice & { lineId?: string })[];
    solutions: Choice[];
    types: (Choice & { categoryId?: string })[];
    categories: Choice[];
    /** Standard products: what an inspiration product can be based on. */
    bases: Choice[];
  };
  /**
   * The records under this one, and the ones that could be moved under it — each with the move that
   * would do it (the same move as dropping it on this card on the Map), one group per level (a solution
   * has two: solution styles and inspiration products, PROD-3095). Empty for a product or an option.
   */
  children: ChildMoves[];
};
export type ChildMoves = { level: string; label: string; items: Choice[]; add: (Choice & { move: MoveDraft })[] };

export async function loadParents(level: string, id: string): Promise<Loaded<ParentsData>> {
  const [res, allowed] = await Promise.all([loadRulesSource(), canEdit()]);
  if (!res.ok) return res;
  const src = res.data;
  const choice = (group: string) => (x: { _id: string; title?: string }): Choice => ({ id: x._id, title: x.title ?? x._id, group });
  const catName = new Map(src.categories.map((c) => [c._id, c.title ?? c._id]));
  const lineName = new Map(src.lines.map((l) => [l._id, l.title ?? l._id]));
  const choices: ParentsData["choices"] = {
    lines: src.lines.map(choice("Line")),
    styles: src.styles.map((s) => ({ ...choice(lineName.get(s.lineId ?? "") ?? "Style")(s), lineId: s.lineId })),
    solutions: src.solutions.map(choice("Solution")),
    types: src.catalog.types.map((t) => ({ ...choice(catName.get(t.categoryId ?? "") ?? "Type")(t), categoryId: t.categoryId })),
    categories: src.categories.map(choice("Category")),
    bases: src.products.map(choice("Standard product")),
  };
  const out = (kind: ParentsData["kind"], current: ParentsData["current"] = {}, ...children: ChildMoves[]): Loaded<ParentsData> =>
    ({ ok: true, data: { canEdit: allowed, kind, current, choices, children } });
  const lineOf = new Map(src.styles.map((x) => [x._id, x.lineId]));
  if (level === "product" || level === "inspiration") {
    const p = src.products.find((x) => x._id === id);
    if (p) return out("standard", { lineId: p.lineId, styleIds: p.styleIds, solutionIds: p.solutionIds });
    const i = src.inspirations.find((x) => x._id === id);
    if (i) return out("inspiration", { baseId: i.basedOn, solutionIds: i.solutionIds ?? [] });
    return out("none");
  }
  if (level === "productStyle") {
    const s = src.styles.find((x) => x._id === id);
    if (!s) return out("none");
    // A product moved under this style takes it as its primary style (as a drop on the Map does).
    const products = src.products.filter((p) => p.styleIds.includes(id));
    return out("style", { lineId: s.lineId }, {
      level: "product", label: "Products",
      items: products.map(choice("Standard product")),
      add: src.products.filter((p) => !p.styleIds.includes(id)).map((p) => ({
        ...choice(lineName.get(p.lineId ?? "") ?? "Standard product")(p),
        move: { kind: "placement", productId: p._id, lineId: s.lineId ?? "", styleIds: [id, ...p.styleIds.filter((x) => x !== id && lineOf.get(x) === s.lineId)] },
      })),
    });
  }
  if (level === "productLine") {
    const styles = src.styles.filter((x) => x.lineId === id);
    return out("line", {}, {
      level: "productStyle", label: "Styles",
      items: styles.map(choice("Style")),
      add: src.styles.filter((x) => x.lineId !== id).map((x) => ({ ...choice(lineName.get(x.lineId ?? "") ?? "Style")(x), move: { kind: "styleLine", styleId: x._id, lineId: id } })),
    });
  }
  if (level === "customizationCategory") {
    return out("category", {}, {
      level: "customizationType", label: "Types",
      items: src.catalog.types.filter((t) => t.categoryId === id).map(choice("Type")),
      add: src.catalog.types.filter((t) => t.categoryId !== id).map((t) => ({ ...choice(catName.get(t.categoryId ?? "") ?? "Type")(t), move: { kind: "typeCategory", typeId: t._id, categoryId: id } })),
    });
  }
  if (level === "solutionStyle") {
    const x = src.solutionStyles.find((y) => y._id === id);
    return x ? out("solutionStyle", { solutionId: x.solutionId }) : out("none");
  }
  if (level === "solution") {
    const has = (i: { solutionIds?: string[] }) => (i.solutionIds ?? []).includes(id);
    const solName = new Map(src.solutions.map((x) => [x._id, x.title ?? x._id]));
    return out("solution", {}, {
      level: "solutionStyle", label: "Solution styles",
      items: src.solutionStyles.filter((x) => x.solutionId === id).map(choice("Solution style")),
      add: src.solutionStyles.filter((x) => x.solutionId !== id).map((x) => ({ ...choice(solName.get(x.solutionId ?? "") ?? "Solution style")(x), move: { kind: "solutionStyleSolution", styleId: x._id, solutionId: id } })),
    }, {
      level: "inspiration", label: "Inspiration products",
      items: src.inspirations.filter(has).map(choice("Inspiration product")),
      // Added as the primary solution, as a drop on the Map does; its other solutions stay.
      add: src.inspirations.filter((i) => !has(i)).map((i) => ({ ...choice("Inspiration product")(i), move: { kind: "solutions", productId: i._id, solutionIds: [id, ...(i.solutionIds ?? [])] } })),
    });
  }
  if (level === "customizationOption") {
    const o = src.catalog.options.find((x) => x._id === id);
    return o ? out("option", { typeId: o.typeId }) : out("none");
  }
  if (level === "customizationType") {
    const t = src.catalog.types.find((x) => x._id === id);
    if (!t) return out("none");
    const typeName = new Map(src.catalog.types.map((x) => [x._id, x.title ?? x._id]));
    return out("type", { categoryId: t.categoryId }, {
      level: "customizationOption", label: "Options",
      items: src.catalog.options.filter((o) => o.typeId === id).map(choice("Option")),
      add: src.catalog.options.filter((o) => o.typeId !== id).map((o) => ({ ...choice(typeName.get(o.typeId) ?? "Option")(o), move: { kind: "optionType", optionId: o._id, typeId: id } })),
    });
  }
  return out("none");
}
