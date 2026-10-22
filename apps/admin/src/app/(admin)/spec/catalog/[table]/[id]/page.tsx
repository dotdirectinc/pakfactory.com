import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCatalogRecord } from "@/lib/spec/catalog-record";
import { isTableKey, levelOf } from "@/lib/spec/catalog-table-model";
import { SpecRecordView } from "@/components/spec/spec-record-view";
import { SectionSkeleton } from "@/components/ui/page-skeleton";
import { listRecordSkuHistory, listRecordSyncChanges } from "@/lib/spec/registry-api";
import { typeidToUuid } from "@/lib/spec/typeid";
import { fieldChanges } from "@/lib/spec/sync-applied";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { ADMIN_SPEC_RECORD_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Catalog record" };

/**
 * A catalog record (2026-10-08, Richard): every record at every level and status has a page — its
 * images, registry identity, the records above it (as links in its fields) and below it, and every
 * field. Standard products and options also link to their rules view. Below it, the changes
 * Sync Changes applied to it from Sanity (PROD-3119), loaded on their own so the record is not held up;
 * for a product, its SKU history as "old → new" (editors, 2026-10-22).
 */
export default async function SpecCatalogRecordPage({ params }: { params: Promise<{ table: string; id: string }> }) {
  const { table, id } = await params;
  if (!isTableKey(table)) notFound();
  const where = levelOf(table);
  // Access check and data load together (PROD-3116); the data is only rendered once the check passes.
  const [, res] = await Promise.all([requireRegistryGrant(), getCatalogRecord(table, decodeURIComponent(id))]);
  if (res.ok && !res.data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {where ? (
        <Link
          href={`/spec/catalog?group=${where.group.key}&level=${table}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {where.group.label} · {where.level.label}
        </Link>
      ) : null}

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      ) : (
        <>
          <SpecRecordView record={res.data!} />
          {table === "product" || table === "inspiration" ? (
            <section className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-semibold text-foreground">{COPY.skuHistoryTitle}</h2>
                <p className="text-sm text-muted-foreground">{COPY.skuHistoryLead}</p>
              </div>
              <Suspense fallback={<SectionSkeleton rows={1} label={COPY.loadingSkuHistory} />}>
                <SkuHistory registryId={typeidToUuid(res.data!.registry?.entityId)?.uuid ?? null} />
              </Suspense>
            </section>
          ) : null}
          <section className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">{COPY.syncChangesTitle}</h2>
              <p className="text-sm text-muted-foreground">{COPY.syncChangesLead}</p>
            </div>
            <Suspense fallback={<SectionSkeleton rows={3} label={COPY.loadingSyncChanges} />}>
              <SyncChanges registryId={typeidToUuid(res.data!.registry?.entityId)?.uuid ?? null} />
            </Suspense>
          </section>
        </>
      )}
    </div>
  );
}

/** A product's SKUs before this one, newest first: "COR-006-BR1 → FCT-084-BR1". */
async function SkuHistory({ registryId }: { registryId: string | null }) {
  if (!registryId) return <p className="text-sm text-muted-foreground">{COPY.syncChangesNoRegistry}</p>;
  const res = await listRecordSkuHistory(registryId);
  // A server without the route (before backend #375) has no history to show: say it never changed.
  if (!res.ok && res.status !== 404) return <p role="alert" className="text-sm text-destructive">{COPY.skuHistoryUnreachable} ({res.error})</p>;
  const rows = res.ok ? res.data : [];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{COPY.skuHistoryNone}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {rows.map((c) => (
        <li key={c.from} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span className="font-mono text-foreground">{c.to ? `${c.from} → ${c.to}` : <>{c.from} <span className="font-sans text-muted-foreground">{COPY.skuDeleted}</span></>}</span>
          <span className="shrink-0 text-xs text-muted-foreground"><LocalTime iso={c.at} preset="dateTime" /></span>
        </li>
      ))}
    </ul>
  );
}

/** What Sync Changes applied to this record with no frame, newest first, each with its run. */
async function SyncChanges({ registryId }: { registryId: string | null }) {
  if (!registryId) return <p className="text-sm text-muted-foreground">{COPY.syncChangesNoRegistry}</p>;
  const res = await listRecordSyncChanges(registryId);
  if (!res.ok) return <p role="alert" className="text-sm text-destructive">{COPY.syncChangesUnreachable} ({res.error})</p>;
  if (res.data.length === 0) return <p className="text-sm text-muted-foreground">{COPY.syncChangesNone}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {res.data.map((c, n) => {
        const what = c.change === "added" ? [COPY.added(c.property_value ?? "")]
          : c.change === "removed" ? [COPY.removed(c.property_value ?? "")]
          : fieldChanges(c.before, c.after);
        return (
          <li key={`${c.run.id}-${n}`} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-foreground">{what.join(" · ") || "—"}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {c.run.trigger === "automatic" ? COPY.automaticRun : COPY.manualRun(c.run.by)} · <LocalTime iso={c.at} preset="dateTime" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
