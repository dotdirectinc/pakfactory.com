import type { ChangesetItem } from "./registry-api";
import type { RuleEditDraft } from "./rule-edits";

/**
 * A rule-edit frame's edits, read back from the frame itself (PROD-2962 scope 3: "the impact is saved
 * with the frame and re-checked when the frame is reviewed"). Each Sanity item names the document it
 * writes and the change as ops (field, upsert/remove/set, the entry it is about) — enough to rebuild
 * the edits, so a frame submitted before today can be re-checked too.
 */
type Op = { field?: unknown; kind?: unknown; value?: unknown; match?: { ref?: unknown; mode?: unknown }; item?: { reason?: unknown } };

const refOf = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { _ref?: unknown })._ref === "string" ? (v as { _ref: string })._ref : null;

export function editsOfFrame(items: ChangesetItem[]): RuleEditDraft[] {
  const out: RuleEditDraft[] = [];
  const pairs = new Set<string>();
  const settings = new Map<string, Extract<RuleEditDraft, { kind: "typeSettings" }>>();
  for (const it of items) {
    if (it.entity_type !== "sanity_document" || !it.target_ref || it.excluded_at) continue;
    const doc = it.target_ref;
    const ops = Array.isArray(it.payload?.ops) ? (it.payload.ops as Op[]) : [];
    for (const op of ops) {
      const ref = refOf(op.match?.ref);
      switch (op.field) {
        case "availableCustomizations":
          if (ref) out.push({ kind: "offer", productId: doc, optionId: ref, offered: op.kind !== "remove" });
          break;
        case "customizationExceptions": {
          const mode = op.match?.mode === "add" ? "add" : "remove";
          if (ref) out.push({ kind: "exception", productId: doc, optionId: ref, mode, reason: op.kind === "remove" ? null : String(op.item?.reason ?? "") });
          break;
        }
        case "compatibleCustomizations": {
          // Written on both options; one edit per pair.
          if (!ref) break;
          const key = [doc, ref].sort().join("|");
          if (pairs.has(key)) break;
          pairs.add(key);
          out.push({ kind: "pair", a: doc, b: ref, compatible: op.kind !== "remove" });
          break;
        }
        case "availabilityDecidedBy":
        case "customerSelects": {
          const s = settings.get(doc) ?? { kind: "typeSettings" as const, typeId: doc };
          if (op.field === "availabilityDecidedBy" && (op.value === "product" || op.value === "customization")) s.decidedBy = op.value;
          if (op.field === "customerSelects" && (op.value === "one" || op.value === "many")) s.customerSelects = op.value;
          if (!settings.has(doc)) {
            settings.set(doc, s);
            out.push(s);
          }
          break;
        }
        case "dependsOn": {
          const groups = (Array.isArray(op.value) ? op.value : []).map((g) =>
            (Array.isArray((g as { anyOf?: unknown })?.anyOf) ? ((g as { anyOf: unknown[] }).anyOf) : []).map(refOf).filter((x): x is string => Boolean(x)));
          out.push({ kind: "requirements", typeId: doc, groups: groups.filter((g) => g.length) });
          break;
        }
      }
    }
  }
  return out;
}

/** The impact as a frame saves it (rule-edit-actions.ts, submit): names, not ids. */
export type SavedImpact = {
  totals?: { products: number; gained: number; lost: number };
  warnings?: string[];
  products?: { title: string; gained: string[]; lost: string[] }[];
};
export type ImpactNow = {
  totals: { products: number; gained: number; lost: number };
  warnings: string[];
  errors: string[];
  products: { title: string; gained: string[]; lost: string[] }[];
};

/**
 * Now against when submitted: the same products gaining and losing the same options, the same
 * warnings. Products are compared over what the saved impact kept (its first 50), by name.
 */
export function compareImpact(saved: SavedImpact | null, now: ImpactNow) {
  const key = (p: { gained: string[]; lost: string[] }) => `${[...p.gained].sort().join(",")}|${[...p.lost].sort().join(",")}`;
  const was = new Map((saved?.products ?? []).map((p) => [p.title, key(p)]));
  const changedProducts = now.products.filter((p) => was.get(p.title) !== key(p)).map((p) => p.title);
  const nowTitles = new Set(now.products.map((p) => p.title));
  const noLongerChanged = [...was.keys()].filter((t) => !nowTitles.has(t));
  const savedWarnings = new Set(saved?.warnings ?? []);
  const newWarnings = now.warnings.filter((w) => !savedWarnings.has(w));
  const t = saved?.totals;
  const same =
    Boolean(t) && t!.products === now.totals.products && t!.gained === now.totals.gained && t!.lost === now.totals.lost &&
    !changedProducts.length && !noLongerChanged.length && !newWarnings.length && !now.errors.length;
  return { same, changedProducts, noLongerChanged, newWarnings };
}
