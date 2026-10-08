import Link from "next/link";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { TABLE_GROUPS, getCatalogTable, isTableKey } from "@/lib/spec/catalog-tables";
import { SpecCatalogTable } from "@/components/spec/spec-catalog-table";
import { SpecCatalogLevelSelect } from "@/components/spec/spec-catalog-level-select";
import { ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Catalog tables" };

/** Catalog tables (PROD-2926): three groups as tabs, a level picker, one table per record type. */
export default async function SpecCatalogPage({ searchParams }: { searchParams: Promise<{ group?: string; level?: string }> }) {
  await requireRegistryGrant();
  const sp = await searchParams;
  const group = TABLE_GROUPS.find((g) => g.key === sp.group) ?? TABLE_GROUPS[0]!;
  const level = isTableKey(sp.level) && group.levels.some((l) => l.key === sp.level) ? sp.level : group.levels[group.levels.length - 1]!.key;
  const res = await getCatalogTable(level);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{COPY.lead}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={COPY.title} className="flex gap-1 rounded-md border border-border p-1">
          {TABLE_GROUPS.map((g) => (
            <Link
              key={g.key}
              href={`/spec/catalog?group=${g.key}`}
              aria-current={g.key === group.key ? "page" : undefined}
              className={`rounded px-3 py-1.5 text-sm ${g.key === group.key ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {g.label}
            </Link>
          ))}
        </nav>
        <SpecCatalogLevelSelect group={group} level={level} label={COPY.level} />
      </div>

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
