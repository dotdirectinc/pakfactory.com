import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCatalogRecord } from "@/lib/spec/catalog-record";
import { isTableKey, levelOf } from "@/lib/spec/catalog-table-model";
import { SpecRecordView } from "@/components/spec/spec-record-view";
import { ADMIN_SPEC_RECORD_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Catalog record" };

/**
 * A catalog record (2026-10-08, Richard): every record at every level and status has a page — its
 * images, registry identity, the records above it (as links in its fields) and below it, and every
 * field. Standard products and active options also link to their rules view.
 */
export default async function SpecCatalogRecordPage({ params }: { params: Promise<{ table: string; id: string }> }) {
  await requireRegistryGrant();
  const { table, id } = await params;
  if (!isTableKey(table)) notFound();
  const where = levelOf(table);
  const res = await getCatalogRecord(table, decodeURIComponent(id));
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
        <SpecRecordView record={res.data!} />
      )}
    </div>
  );
}
