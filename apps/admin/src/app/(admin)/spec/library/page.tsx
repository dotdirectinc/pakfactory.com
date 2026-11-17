import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryItemsTable } from "@/components/spec/library/library-items-table";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { listLibraryChanges, listLibraryItems, listLibraryVersions } from "@/lib/spec/registry-api";
import {
  LIBRARY_COLLECTIONS,
  LINES,
  PAGE_SIZE,
  apiLine,
  STATE_FILTERS,
  isCollection,
  lineOf,
  listHref,
  pageOf,
  stateOf,
  totals,
} from "@/lib/spec/library-review";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Library review" };

type SP = { version?: string; collection?: string; state?: string; search?: string; page?: string; line?: string };

/**
 * Spec Library review (PFP-124 / PLAT-51, PLAT-81). Records are approved one by one; there is no
 * whole-version approval. A product line (default Folding Cartons) narrows every count and list.
 * Changes a new export makes to approved records wait on the Held changes page.
 * Reviewing writes only to the registry — nothing reaches the website or Sanity.
 */
export default async function SpecLibraryReviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const line = lineOf(sp.line);
  const [me, versionsRes, changesRes] = await Promise.all([
    requireRegistryGrant(),
    listLibraryVersions(apiLine(line)),
    listLibraryChanges({ state: "waiting", line: apiLine(line) }),
  ]);
  const waitingChanges = changesRes.ok ? changesRes.data.items.length : 0;
  const canDecide = canReviewLibrary(me);

  if (!versionsRes.ok) {
    return (
      <Shell>
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({versionsRes.error})
        </p>
      </Shell>
    );
  }
  const versions = versionsRes.data;
  if (versions.length === 0) {
    return (
      <Shell>
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noVersions}</p>
      </Shell>
    );
  }

  const version = versions.find((v) => String(v.number) === sp.version) ?? versions[0]!;
  const collection = isCollection(sp.collection) ? sp.collection : LIBRARY_COLLECTIONS[0].key;
  const state = stateOf(sp.state);
  const search = sp.search?.trim().slice(0, 100) || undefined;
  const page = pageOf(sp.page);
  const t = totals(version.collections);
  const progressOf = (key: string) => version.collections.find((c) => c.collection === key);

  const itemsRes = await listLibraryItems(version.number, {
    collection,
    state: state === "all" ? undefined : state,
    search,
    line: apiLine(line),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <Shell
      aside={
        <Link href={`/spec/library/changes${line === "CAT-FC" ? "" : `?line=${line}`}`} className="text-sm text-primary hover:underline">
          {COPY.heldChangesLink(waitingChanges)}
        </Link>
      }
    >
      {/* Product line: every count and list below is narrowed to it. */}
      <nav aria-label={COPY.lineHeading} className="flex flex-wrap items-center gap-1 text-sm">
        <span className="mr-1 text-muted-foreground">{COPY.lineHeading}</span>
        {LINES.map((l) => (
          <Link
            key={l.key}
            href={listHref({ version: version.number, collection, line: l.key })}
            aria-current={l.key === line ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1",
              l.key === line ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* Version and its overall progress. */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex gap-2">
          {versions.map((v) => (
            <Link
              key={v.number}
              href={listHref({ version: v.number, collection, line })}
              className={cn(
                "rounded-md border px-3 py-1",
                v.number === version.number ? "border-primary font-medium" : "border-border text-muted-foreground",
              )}
            >
              {COPY.version(v.number)}
            </Link>
          ))}
        </div>
        <span className="text-muted-foreground">
          {COPY.exportedAt} {version.sourceExportedAt} · {COPY.importedAt} <LocalTime iso={version.importedAt} preset="dateTime" />
        </span>
        <span className="font-medium">{COPY.progress(t.decided, t.total)}</span>
        <span className="text-muted-foreground">{COPY.open(t.open)}</span>
        {version.importSummary ? (
          <span className="text-muted-foreground">{COPY.importSummary(version.importSummary)}</span>
        ) : null}
      </section>
      {!canDecide ? <p className="text-sm text-muted-foreground">{COPY.readOnlyNote}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Collections with their counts: the reviewer's checklist. */}
        <nav aria-label={COPY.collectionsHeading} className="flex flex-col gap-1">
          {LIBRARY_COLLECTIONS.map((c) => {
            const p = progressOf(c.key);
            const open = (p?.pending ?? 0) + (p?.defer ?? 0);
            return (
              <Link
                key={c.key}
                href={listHref({ version: version.number, collection: c.key, state, line })}
                aria-current={c.key === collection ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                  c.key === collection ? "bg-muted font-medium" : "hover:bg-muted/50",
                )}
              >
                <span>{c.label}</span>
                <span className={cn("text-xs", open > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {open > 0 ? open : "✓"} / {p?.total ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="tablist">
              {STATE_FILTERS.map((s) => (
                <Link
                  key={s.key}
                  role="tab"
                  aria-selected={s.key === state}
                  href={listHref({ version: version.number, collection, state: s.key, search, line })}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm",
                    s.key === state ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <form action="/spec/library" className="flex gap-2">
              <input type="hidden" name="version" value={version.number} />
              <input type="hidden" name="collection" value={collection} />
              {line !== "CAT-FC" ? <input type="hidden" name="line" value={line} /> : null}
              {state !== "pending" ? <input type="hidden" name="state" value={state} /> : null}
              <Input name="search" defaultValue={search} placeholder={COPY.searchPlaceholder} className="h-8 w-56" />
              <Button size="sm" variant="outline" type="submit">
                {COPY.search}
              </Button>
            </form>
          </div>

          {itemsRes.ok ? (
            <>
              <LibraryItemsTable
                key={`${line}/${version.number}/${collection}/${state}/${search ?? ""}/${page}`}
                version={version.number}
                collection={collection}
                items={itemsRes.data.items}
                canDecide={canDecide}
              />
              <Pager
                total={itemsRes.data.total}
                page={page}
                href={(p) => listHref({ version: version.number, collection, state, search, page: p, line })}
              />
            </>
          ) : (
            <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
              {COPY.unreachable} ({itemsRes.error})
            </p>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children, badge, aside }: { children: React.ReactNode; badge?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader title={COPY.title} lead={COPY.lead} badge={badge} aside={aside} />
      {children}
    </div>
  );
}

function Pager({ total, page, href }: { total: number; page: number; href: (p: number) => string }) {
  if (total <= PAGE_SIZE) return total > 0 ? <p className="text-xs text-muted-foreground">{COPY.showing(1, total, total)}</p> : null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const last = Math.ceil(total / PAGE_SIZE);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{COPY.showing(from, to, total)}</span>
      {page > 1 ? <Link href={href(page - 1)} className="text-primary hover:underline">{COPY.previous}</Link> : null}
      {page < last ? <Link href={href(page + 1)} className="text-primary hover:underline">{COPY.next}</Link> : null}
    </div>
  );
}
