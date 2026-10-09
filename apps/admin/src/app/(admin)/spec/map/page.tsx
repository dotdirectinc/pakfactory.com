import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getSpecMap } from "@/lib/spec/spec-map";
import { SpecMap } from "@/components/spec/spec-map";
import { ADMIN_SPEC_MAP_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Spec Map" };

/** Spec Map (PROD-2960): the catalog's structure as a diagram — read-only. */
export default async function SpecMapPage() {
  await requireRegistryGrant();
  const res = await getSpecMap();

  return (
    <div className="flex h-[calc(100dvh-7rem)] w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.title}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{COPY.lead}</p>
      </div>
      {res.ok ? (
        <SpecMap data={res.data} />
      ) : (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      )}
    </div>
  );
}
