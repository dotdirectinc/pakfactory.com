import { loadRulesSource } from "@/lib/spec/rules-source";
import { computeImpact } from "@/lib/spec/rule-edits";
import { compareImpact, editsOfFrame, type SavedImpact } from "@/lib/spec/frame-edits";
import type { ChangesetItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_RULE_EDIT_COPY as COPY } from "@/lib/copy/spec";

/**
 * A waiting rule-edit frame's impact, re-checked when it is reviewed (PROD-2962 scope 3): the frame's
 * edits, rebuilt from its own items, run through the storefront's engine on the catalog as it is now,
 * against the impact saved when it was submitted. Other approved changes since can make the same edits
 * do something else — or break a rule — and the approver should know before approving.
 */
export async function SpecFrameImpactNow({ items, summary }: { items: ChangesetItem[]; summary: Record<string, unknown> }) {
  const edits = editsOfFrame(items);
  if (!edits.length) return <p className="text-sm text-muted-foreground">{COPY.recheckNothing}</p>;
  const src = await loadRulesSource();
  if (!src.ok) return <p className="text-sm text-muted-foreground">{COPY.recheckUnreachable} ({src.error})</p>;
  const { catalog, products, name, inspirations } = src.data;
  const impact = computeImpact(catalog, products, edits, name, inspirations);
  const now = {
    totals: impact.totals,
    warnings: impact.warnings.map((w) => w.text),
    errors: impact.errors,
    products: impact.products.map((p) => ({ title: p.title, gained: p.gained.map(name), lost: p.lost.map(name) })),
  };
  const saved = (summary.impact && typeof summary.impact === "object" ? summary.impact : null) as SavedImpact | null;
  const diff = compareImpact(saved, now);

  if (diff.same) {
    return (
      <section className="flex flex-col gap-1 rounded-md border border-green-600/30 bg-green-600/5 p-4 text-sm">
        <h2 className="font-medium text-foreground">{COPY.recheckTitle}</h2>
        <p className="text-muted-foreground">✓ {COPY.recheckSame}</p>
      </section>
    );
  }
  const changed = new Set(diff.changedProducts);
  return (
    <section role="alert" className={`flex flex-col gap-2 rounded-md border p-4 text-sm ${now.errors.length ? "border-destructive/50 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10"}`}>
      <h2 className="font-medium text-foreground">{COPY.recheckTitle}</h2>
      <p className="text-foreground/80">{COPY.recheckChanged}</p>
      {now.errors.length ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-destructive">{COPY.recheckErrors}</span>
          <ul className="list-disc pl-5 text-destructive">{now.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}
      <p>{now.totals.products ? COPY.totals(now.totals) : COPY.noProductChange}</p>
      {diff.changedProducts.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.recheckChangedProducts}</span>
          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-card p-2 text-xs">
            {now.products.filter((p) => changed.has(p.title)).slice(0, 50).map((p) => (
              <li key={p.title}>
                <span className="font-medium">{p.title}</span>
                {p.gained.length ? <span className="text-green-700 dark:text-green-400"> +{p.gained.join(", ")}</span> : null}
                {p.lost.length ? <span className="text-red-700 dark:text-red-400"> −{p.lost.join(", ")}</span> : null}
              </li>
            ))}
            {diff.changedProducts.length > 50 ? <li className="text-muted-foreground">{COPY.more(diff.changedProducts.length - 50)}</li> : null}
          </ul>
        </div>
      ) : null}
      {diff.noLongerChanged.length ? (
        <p className="text-xs"><span className="font-medium">{COPY.recheckNoLonger}:</span> {diff.noLongerChanged.join(", ")}</p>
      ) : null}
      {diff.newWarnings.length ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.recheckNewWarnings}</span>
          {diff.newWarnings.map((w) => <p key={w} className="text-amber-800 dark:text-amber-300">⚠ {w}</p>)}
        </div>
      ) : null}
    </section>
  );
}
