import { ADMIN_SPEC_RULE_EDIT_COPY as COPY } from "@/lib/copy/spec";

/**
 * A rule-edit frame's own account of itself (PROD-2962): the sentence per change, the note, and the
 * impact check the editor saw when submitting — what an approver weighs before approving.
 */
type Impact = {
  totals?: { products: number; gained: number; lost: number };
  warnings?: string[];
  products?: { title: string; gained: string[]; lost: string[] }[];
};

export function SpecEditSummary({ summary }: { summary: Record<string, unknown> }) {
  const sentences = Array.isArray(summary.sentences) ? (summary.sentences as string[]) : [];
  const note = typeof summary.note === "string" ? summary.note : null;
  const impact = (summary.impact && typeof summary.impact === "object" ? summary.impact : null) as Impact | null;
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">{COPY.frameHeading}</h2>
      {sentences.length ? (
        <ul className="list-disc pl-5 text-sm text-foreground">{sentences.map((s) => <li key={s}>{s}</li>)}</ul>
      ) : null}
      {note ? <p className="text-sm"><span className="text-muted-foreground">{COPY.frameNote}</span> {note}</p> : null}
      {impact?.totals ? (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.frameImpact}</span>
          <p>{impact.totals.products ? COPY.totals(impact.totals) : COPY.noProductChange}</p>
          {impact.products?.length ? (
            <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-2 text-xs">
              {impact.products.map((p) => (
                <li key={p.title}>
                  <span className="font-medium">{p.title}</span>
                  {p.gained.length ? <span className="text-green-700 dark:text-green-400"> +{p.gained.join(", ")}</span> : null}
                  {p.lost.length ? <span className="text-red-700 dark:text-red-400"> −{p.lost.join(", ")}</span> : null}
                </li>
              ))}
              {impact.totals.products > impact.products.length ? <li className="text-muted-foreground">{COPY.more(impact.totals.products - impact.products.length)}</li> : null}
            </ul>
          ) : null}
          {impact.warnings?.map((w) => <p key={w} className="text-amber-800 dark:text-amber-300">⚠ {w}</p>)}
        </div>
      ) : null}
    </section>
  );
}
