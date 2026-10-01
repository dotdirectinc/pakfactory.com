import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getPropertyList } from "@/lib/spec/catalog-browse";
import { SpecPropertyList } from "@/components/spec/spec-property-list";
import { ADMIN_SPEC_BROWSE_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Properties" };

/** Every property and value in Sanity, with its registry id and where it is used. Read-only. */
export default async function SpecPropertiesPage() {
  await requireRegistryGrant();
  const res = await getPropertyList();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.propertiesTitle}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.propertiesLead}</p>
        {res.ok && <p className="text-xs tabular-nums text-muted-foreground">{COPY.propertyTotals(res.data.totals)}</p>}
      </div>
      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : (
        <SpecPropertyList properties={res.data.properties} />
      )}
    </div>
  );
}
