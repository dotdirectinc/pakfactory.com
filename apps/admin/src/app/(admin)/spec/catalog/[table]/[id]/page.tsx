import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCatalogRecord, type CatalogRecord } from "@/lib/spec/catalog-record";
import { isTableKey, levelOf } from "@/lib/spec/catalog-table-model";
import { SpecRegistryId } from "@/components/spec/spec-registry-id";
import { ADMIN_SPEC_RECORD_COPY as COPY } from "@/lib/copy/spec";

export const metadata = { title: "Catalog record" };

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

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
        <Record record={res.data!} />
      )}
    </div>
  );
}

function Record({ record: r }: { record: CatalogRecord }) {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {r.images[0] ? (
          <img src={`${r.images[0]}?w=240&h=240&fit=crop&auto=format`} alt="" className="size-28 shrink-0 rounded-md border border-border object-cover" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{r.title}</h1>
            {r.status ? <Badge variant={r.status === "active" ? "secondary" : "outline"}>{r.status}</Badge> : null}
          </div>
          <SpecRegistryId registry={r.registry} />
          {r.rulesHref ? (
            <Link href={r.rulesHref} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground hover:underline">
              {COPY.rules} <ArrowUpRight className="size-4" />
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">{COPY.readOnly(r.dataset)}</p>
        </div>
      </header>

      {r.images.length > 1 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">{COPY.images(r.images.length)}</h2>
          <div className="flex flex-wrap gap-2">
            {r.images.map((src, i) => (
              <a key={`${src}-${i}`} href={src} target="_blank" rel="noreferrer">
                <img src={`${src}?w=160&h=160&fit=crop&auto=format`} alt="" loading="lazy" className="size-24 rounded-md border border-border object-cover" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {r.children.map((c) => (
        <section key={c.label} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {c.label} <span className="font-normal text-muted-foreground">({c.total})</span>
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border first:border-t-0 even:bg-muted/50 hover:bg-muted">
                    <td className="px-3 py-2">
                      <Link href={row.href} className="font-medium text-foreground hover:underline">{row.title}</Link>
                    </td>
                    <td className="w-40 px-3 py-2 text-muted-foreground">{row.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.total > c.rows.length ? <p className="text-xs text-muted-foreground">{COPY.more(c.rows.length, c.total)}</p> : null}
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">{COPY.fields}</h2>
        <dl className="overflow-hidden rounded-md border border-border bg-card text-sm">
          {r.fields.map((f) => (
            <div key={f.key} className="grid gap-1 border-t border-border px-3 py-2 first:border-t-0 even:bg-muted/50 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="min-w-0 break-words text-foreground">
                {f.links.length ? (
                  <span className="flex flex-wrap gap-x-2 gap-y-1">
                    {f.links.map((l, i) =>
                      l.href ? (
                        <Link key={`${l.title}-${i}`} href={l.href} className="underline-offset-2 hover:underline">{l.title}</Link>
                      ) : (
                        <span key={`${l.title}-${i}`}>{l.title}</span>
                      ),
                    )}
                  </span>
                ) : f.text === null ? (
                  <span className="text-muted-foreground/60">—</span>
                ) : f.key === "_createdAt" || f.key === "_updatedAt" ? (
                  when(String(f.text))
                ) : (
                  String(f.text)
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
