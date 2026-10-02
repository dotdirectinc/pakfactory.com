import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getSolutionTree } from "@/lib/spec/solution-browse";
import { SpecSolutionTree } from "@/components/spec/spec-solution-tree";
import { ADMIN_SPEC_RULES_COPY, ADMIN_SPEC_SOLUTIONS_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Solutions" };

/** Every solution → its solution styles → its inspiration products, with registry ids. Read-only. */
export default async function SpecSolutionsPage() {
  await requireRegistryGrant();
  const res = await getSolutionTree();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.solutionsTitle}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.solutionsLead}</p>
        {res.ok && <p className="text-xs tabular-nums text-muted-foreground">{COPY.solutionTotals(res.data.totals)}</p>}
        {res.ok && !res.data.includesDrafts && <p className="max-w-2xl text-xs text-muted-foreground">{COPY.publishedOnly}</p>}
      </div>
      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : (
        <SpecSolutionTree solutions={res.data.solutions} />
      )}
    </div>
  );
}
