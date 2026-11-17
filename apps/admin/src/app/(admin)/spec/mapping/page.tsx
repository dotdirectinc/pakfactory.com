import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { MappingReviewList } from "@/components/spec/mapping/mapping-review-list";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { listSpecMappings } from "@/lib/spec/registry-api";
import { websiteLinks } from "@/lib/spec/mapping-links";
import { LINES } from "@/lib/spec/library-review";
import { apiState, KINDS, MAP_LABELS, MAP_STATES, mappingHref, mappingParams } from "@/lib/spec/mapping-review";
import { ADMIN_SPEC_MAPPING_COPY as COPY } from "@/lib/copy/spec-mapping";

export const metadata = { title: "Mapping review" };

type SP = { kind?: string; line?: string; state?: string; label?: string; search?: string };

/**
 * Mapping review (PLAT-52): the maps from website products, options and property values to the
 * production spec, loaded from Terence's mapping draft (PLAT-82), decided map by map or a group at a
 * time. Reviewing writes only to the registry — nothing reaches the website or Sanity.
 */
export default async function SpecMappingReviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const p = mappingParams(await searchParams);
  const [me, res, linkMap] = await Promise.all([
    requireRegistryGrant(),
    listSpecMappings({ kind: p.kind, line: p.line, state: apiState(p.state), label: p.label ?? undefined, search: p.search ?? undefined }),
    websiteLinks(),
  ]);
  // Only the links this page shows go to the client.
  const links = Object.fromEntries(
    (res.ok ? res.data.items : []).flatMap((i) => {
      const l = linkMap.get(i.subjectId);
      return l ? [[i.subjectId, { href: l.href, table: l.table, id: l.id }]] : [];
    }),
  );
  const canDecide = canReviewLibrary(me);
  const lineName = LINES.find((l) => l.key === p.line)?.label ?? p.line;
  const kind = KINDS.find((k) => k.key === p.kind)!;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader title={COPY.title} lead={COPY.lead} />

      <nav aria-label={COPY.lineHeading} className="flex flex-wrap items-center gap-1 text-sm">
        <span className="mr-1 text-muted-foreground">{COPY.lineHeading}</span>
        {LINES.filter((l) => l.key !== "all").map((l) => (
          <Link
            key={l.key}
            href={mappingHref({ ...p, line: l.key, label: null, search: null })}
            aria-current={l.key === p.line ? "page" : undefined}
            className={cn("rounded-md px-2.5 py-1", l.key === p.line ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50")}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <nav aria-label={COPY.title} className="flex gap-1 border-b border-border text-sm">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={mappingHref({ line: p.line, kind: k.key })}
            aria-current={k.key === p.kind ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2", k.key === p.kind ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      ) : res.data.total === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noneLoaded(lineName)}</p>
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-medium">
              {COPY.progress(res.data.total - (res.data.states?.pending ?? 0) - (res.data.states?.defer ?? 0), res.data.total)}
            </span>
            <span className="text-muted-foreground">
              {(["pending", "approve", "defer", "reject"] as const).map((s) => `${COPY.states[s]} ${res.data.states?.[s] ?? 0}`).join(" · ")}
            </span>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 text-sm" role="tablist">
              {MAP_STATES.map((s) => (
                <Link
                  key={s.key}
                  role="tab"
                  aria-selected={s.key === p.state}
                  href={mappingHref({ ...p, state: s.key })}
                  className={cn("rounded-md px-3 py-1", s.key === p.state ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50")}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <form action="/spec/mapping" className="flex gap-2">
              {p.kind !== "product" ? <input type="hidden" name="kind" value={p.kind} /> : null}
              {p.line !== "CAT-FC" ? <input type="hidden" name="line" value={p.line} /> : null}
              {p.state !== "open" ? <input type="hidden" name="state" value={p.state} /> : null}
              {p.label ? <input type="hidden" name="label" value={p.label} /> : null}
              <Input name="search" defaultValue={p.search ?? ""} placeholder={COPY.searchPlaceholder} className="h-8 w-56" />
              <Button size="sm" variant="outline" type="submit">
                {COPY.search}
              </Button>
            </form>
          </div>

          <nav aria-label={COPY.labelHeading} className="flex flex-wrap items-center gap-1 text-sm">
            <span className="mr-1 text-muted-foreground">{COPY.labelHeading}</span>
            <Link
              href={mappingHref({ ...p, label: null })}
              aria-current={p.label === null ? "page" : undefined}
              className={cn("rounded-md border px-2.5 py-0.5", p.label === null ? "border-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/50")}
            >
              {COPY.allLabels} {res.data.total}
            </Link>
            {MAP_LABELS.map((l) => (
              <Link
                key={l.key}
                href={mappingHref({ ...p, label: l.key })}
                title={l.hint}
                aria-current={p.label === l.key ? "page" : undefined}
                className={cn("rounded-md border px-2.5 py-0.5", p.label === l.key ? "border-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/50")}
              >
                {l.label} {res.data.labels?.[l.key] ?? 0}
              </Link>
            ))}
          </nav>

          {!canDecide ? <p className="text-sm text-muted-foreground">{COPY.readOnlyNote}</p> : null}
          <MappingReviewList key={mappingHref(p)} items={res.data.items} links={links} canDecide={canDecide} groupBy={kind.groupBy} />
        </>
      )}
    </div>
  );
}
