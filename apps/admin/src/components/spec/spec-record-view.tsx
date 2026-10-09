"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import type { CatalogRecord } from "@/lib/spec/catalog-record";
import { isTableKey, type TableKey } from "@/lib/spec/catalog-table-model";
import { SpecRegistryId } from "@/components/spec/spec-registry-id";
import { ADMIN_SPEC_RECORD_COPY as COPY } from "@/lib/copy/spec";

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

/** `/spec/catalog/<level>/<id>` → its level and id; anything else is not a record link. */
function recordTarget(href: string): { key: TableKey; id: string } | null {
  const m = /^\/spec\/catalog\/([^/?#]+)\/([^/?#]+)$/.exec(href);
  return m && isTableKey(m[1]) ? { key: m[1], id: decodeURIComponent(m[2]!) } : null;
}

type OnSelect = (key: TableKey, id: string) => void;

/** A link to another record: a selection when the host handles one (the map), else navigation. */
function RecordLink({ href, className, onSelect, children }: { href: string; className: string; onSelect?: OnSelect; children: React.ReactNode }) {
  const target = onSelect ? recordTarget(href) : null;
  return target ? (
    <button type="button" className={`text-left ${className}`} onClick={() => onSelect!(target.key, target.id)}>
      {children}
    </button>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * One catalog record — its images, registry identity, the records below it and every field (the
 * records above it are links in its fields). The Catalog renders it as a page; the Spec Map in its
 * side panel (PROD-2960), where `onSelect` turns links to other records into selections on the map
 * instead of navigation.
 */
export function SpecRecordView({
  record: r,
  heading = "h1",
  onSelect,
}: {
  record: CatalogRecord;
  heading?: "h1" | "h2";
  onSelect?: OnSelect;
}) {
  const Title = heading;
  const Section = heading === "h1" ? "h2" : "h3";


  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {r.images[0] ? (
          <img src={`${r.images[0]}?w=240&h=240&fit=crop&auto=format`} alt="" className="size-28 shrink-0 rounded-md border border-border object-cover" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Title className="text-xl font-semibold tracking-tight text-foreground">{r.title}</Title>
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
          <Section className="text-base font-semibold text-foreground">{COPY.images(r.images.length)}</Section>
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
          <Section className="text-base font-semibold text-foreground">
            {c.label} <span className="font-normal text-muted-foreground">({c.total})</span>
          </Section>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border first:border-t-0 even:bg-muted/50 hover:bg-muted">
                    <td className="px-3 py-2">
                      <RecordLink href={row.href} onSelect={onSelect} className="font-medium text-foreground hover:underline">{row.title}</RecordLink>
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
        <Section className="text-base font-semibold text-foreground">{COPY.fields}</Section>
        <dl className="overflow-hidden rounded-md border border-border bg-card text-sm">
          {r.fields.map((f) => (
            <div key={f.key} className="grid gap-1 border-t border-border px-3 py-2 first:border-t-0 even:bg-muted/50 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="min-w-0 break-words text-foreground">
                {f.links.length ? (
                  <span className="flex flex-wrap gap-x-2 gap-y-1">
                    {f.links.map((l, i) =>
                      l.href ? (
                        <RecordLink key={`${l.title}-${i}`} href={l.href} onSelect={onSelect} className="underline-offset-2 hover:underline">{l.title}</RecordLink>
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
