import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { TABLE_GROUPS, getCatalogTable, isTableKey } from "@/lib/spec/catalog-tables";
import { SpecCatalogTable } from "@/components/spec/spec-catalog-table";
import { SpecCatalogNav } from "@/components/spec/spec-catalog-nav";
import { SpecFutureAction } from "@/components/spec/spec-future-action";
import { ADMIN_SPEC_FUTURE_COPY, ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Catalog" };

/** Catalog tables (PROD-2926): three groups as tabs, a level picker, one table per record type. */
export default async function SpecCatalogPage({ searchParams }: { searchParams: Promise<{ group?: string; level?: string }> }) {
  const sp = await searchParams;
  const group = TABLE_GROUPS.find((g) => g.key === sp.group) ?? TABLE_GROUPS[0]!;
  const level = isTableKey(sp.level) && group.levels.some((l) => l.key === sp.level) ? sp.level : group.defaultLevel;
  // Access check and data load together (PROD-3116); the data is only rendered once the check passes.
  const [, res] = await Promise.all([requireRegistryGrant(), getCatalogTable(level)]);
  const entity = group.levels.find((l) => l.key === level)!.entity;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{COPY.lead}</p>
        </div>
        <SpecFutureAction label={ADMIN_SPEC_FUTURE_COPY.addEntity(entity)} />
      </div>

      <SpecCatalogNav groups={TABLE_GROUPS} group={group} level={level} />

      {res.ok ? (
        <>
          <p className="text-xs text-muted-foreground">{COPY.datasetNote(res.data.dataset)}</p>
          {/* Keyed by table, so switching level starts with that table's own column choice. */}
          <SpecCatalogTable key={level} table={res.data} />
        </>
      ) : (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      )}
    </div>
  );
}
