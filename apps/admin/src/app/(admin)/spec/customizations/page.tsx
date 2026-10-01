import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCustomizationTree } from "@/lib/spec/catalog-browse";
import { SpecCustomizationTree } from "@/components/spec/spec-customization-tree";
import { ADMIN_SPEC_BROWSE_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Customizations" };

/** Every category, type and option in Sanity, with its registry id. Read-only — edits happen in Studio. */
export default async function SpecCustomizationsPage() {
  await requireRegistryGrant();
  const res = await getCustomizationTree();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.customizationsTitle}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.customizationsLead}</p>
        {res.ok && <p className="text-xs tabular-nums text-muted-foreground">{COPY.customizationTotals(res.data.totals)}</p>}
      </div>
      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : (
        <SpecCustomizationTree categories={res.data.categories} />
      )}
    </div>
  );
}
