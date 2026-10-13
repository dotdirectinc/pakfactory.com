"use server";

import { revalidatePath, updateTag } from "next/cache";
import { fetchSpecMe, submitRuleEdits, type RegistryRuleEdit, type RuleEditResult } from "@/lib/spec/registry-api";
import { loadRulesSource, type Loaded } from "@/lib/spec/rules-source";
import { SPEC_RULES_TAG } from "@/lib/spec/cache";
import { computeImpact, describeEdit, focusAfter, type FocusAfter, type Impact, type RuleEditDraft, type RuleFocus, type RuleMeta } from "@/lib/spec/rule-edits";
import { getRuleEditorData, type RuleEditorData } from "@/lib/spec/rule-editor-data";
import { isTableKey } from "@/lib/spec/catalog-table-model";
import { typeidToUuid } from "@/lib/spec/typeid";

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
};

/**
 * The impact check: the storefront's own engine before and after, per standard product; and, for
 * the record in focus, what it offers (or who offers it) once the edits apply.
 */
export async function previewRuleEdits(edits: RuleEditDraft[], focus?: RuleFocus | null): Promise<Loaded<Preview>> {
  if (!(await canEdit())) return { ok: false, error: "Editing rules needs an approver or admin grant." };
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products, name } = res.data;
  const impact = computeImpact(catalog, products, edits, name);
  const ids = new Set([...impact.products.flatMap((p) => [...p.gained, ...p.lost])]);
  return {
    ok: true,
    data: {
      ...impact,
      names: Object.fromEntries([...ids].map((id) => [id, name(id)])),
      sentences: edits.map((e) => describeEdit(e, name)),
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
export async function submitRuleEditsAction(edits: RuleEditDraft[], opts: { approve: boolean; note?: string }): Promise<SubmitResult> {
  if (!(await canEdit())) return { ok: false, error: "Editing rules needs an approver or admin grant." };
  const res = await loadRulesSource();
  if (!res.ok) return res;
  const { catalog, products, name, identity, dataset } = res.data;
  const impact = computeImpact(catalog, products, edits, name);
  if (impact.errors.length) return { ok: false, error: impact.errors[0]!, errors: impact.errors };

  // Sanity id → registry id (the document's entityId TypeID).
  const missing: string[] = [];
  const reg = (id: string) => {
    const u = typeidToUuid(identity(id)?.entityId)?.uuid;
    if (!u) missing.push(name(id));
    return u ?? "";
  };
  const cats = new Set((catalog.categories ?? []).map((c) => c._id));
  const body: RegistryRuleEdit[] = edits.map((e) => {
    switch (e.kind) {
      case "typeSettings": return { kind: e.kind, typeId: reg(e.typeId), ...(e.decidedBy ? { decidedBy: e.decidedBy } : {}), ...(e.customerSelects ? { customerSelects: e.customerSelects } : {}) };
      case "requirements": return { kind: e.kind, typeId: reg(e.typeId), groups: e.groups.map((g) => g.map((x) => (cats.has(x) ? { categoryId: reg(x) } : { typeId: reg(x) }))) };
      case "pair": return { kind: e.kind, a: reg(e.a), b: reg(e.b), compatible: e.compatible };
      case "offer": return { kind: e.kind, productId: reg(e.productId), optionId: reg(e.optionId), offered: e.offered };
      case "exception": return { kind: e.kind, productId: reg(e.productId), optionId: reg(e.optionId), mode: e.mode, reason: e.reason };
    }
  });
  if (missing.length) return { ok: false, error: `Not registered yet: ${[...new Set(missing)].join(", ")}.` };

  const r = await submitRuleEdits({
    dataset, edits: body, approve: opts.approve, note: opts.note,
    impact: { totals: impact.totals, warnings: impact.warnings.map((w) => w.text), products: impact.products.slice(0, 50).map((p) => ({ title: p.title, gained: p.gained.map(name), lost: p.lost.map(name) })) },
  });
  if (!r.ok) return { ok: false, error: r.error, ...(r.errors ? { errors: r.errors } : {}) };
  // The rules views read Sanity; an approved edit changed it (updateTag: this person sees it at once).
  if (r.data.state === "approved") updateTag(SPEC_RULES_TAG);
  revalidatePath("/spec");
  return { ok: true, data: r.data };
}
