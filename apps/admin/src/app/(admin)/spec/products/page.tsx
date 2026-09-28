import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getProductRows } from "@/lib/spec/cached-views";
import { SpecProductTable } from "@/components/spec/spec-product-table";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Products" };

export default async function SpecProductsPage() {
  await requireRegistryGrant();
  const res = await getProductRows();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.listTitle}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.listLead}</p>
      </div>
      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : (
        <SpecProductTable rows={res.data.rows} />
      )}
    </div>
  );
}
