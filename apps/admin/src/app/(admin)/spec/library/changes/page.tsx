import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryChangeDecision } from "@/components/spec/library/library-change-decision";
import { RuleLogic } from "@/components/spec/library/rule-logic";
import { SpecValue } from "@/components/spec/library/spec-value";
import { SYSTEM_KEYS, labelOf, titleOf, type SpecRefs } from "@/lib/spec/library-display";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { listLibraryChanges, type LibraryChange } from "@/lib/spec/registry-api";
import {
  CHANGE_FILTERS,
  DEFAULT_LINE,
  LINES,
  apiLine,
  changeFilterOf,
  changedKeys,
  collectionLabel,
  lineOf,
  reviewCollectionOf,
  type LineKey,
} from "@/lib/spec/library-review";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Held changes" };

type SP = { state?: string; line?: string };

function changesHref(q: { state?: string; line?: LineKey }): string {
  const p = new URLSearchParams();
  if (q.state && q.state !== "waiting") p.set("state", q.state);
  if (q.line && q.line !== DEFAULT_LINE) p.set("line", q.line);
  return `/spec/library/changes${p.size ? `?${p}` : ""}`;
}

/**
 * Held changes (PLAT-81): what the latest export would change in records someone already approved.
 * Each shows the approved values next to the exported ones, field by field. Approve applies the change,
 * reject keeps the approved values, defer leaves it to the next import. The database enforces the rules.
 */
export default async function SpecLibraryChangesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const line = lineOf(sp.line);
  const state = changeFilterOf(sp.state);
  const [me, res] = await Promise.all([
    requireRegistryGrant(),
    listLibraryChanges({ state: state === "all" ? undefined : state, line: apiLine(line) }),
  ]);
  const canDecide = canReviewLibrary(me);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title={COPY.changes.title} lead={COPY.changes.lead} back={{ href: "/spec/library", label: COPY.changes.back }} />

      <nav aria-label={COPY.lineHeading} className="flex flex-wrap items-center gap-1 text-sm">
        <span className="mr-1 text-muted-foreground">{COPY.lineHeading}</span>
        {LINES.map((l) => (
          <Link
            key={l.key}
            href={changesHref({ state, line: l.key })}
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

      <div className="flex flex-wrap gap-1" role="tablist">
        {CHANGE_FILTERS.map((s) => (
          <Link
            key={s.key}
            role="tab"
            aria-selected={s.key === state}
            href={changesHref({ state: s.key, line })}
            className={cn(
              "rounded-md px-3 py-1 text-sm",
              s.key === state ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {COPY.unreachable} ({res.error})
        </p>
      ) : res.data.version === null ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.changes.noImport}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {COPY.changes.version(res.data.version)} · {COPY.changes.finalNote}
          </p>
          {!canDecide ? <p className="text-sm text-muted-foreground">{COPY.readOnlyNote}</p> : null}
          {res.data.items.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.changes.none}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {res.data.items.map((c) => (
                <ChangeCard key={c.item} change={c} canDecide={canDecide} refs={res.data.refs} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ChangeCard({ change: c, canDecide, refs }: { change: LibraryChange; canDecide: boolean; refs?: SpecRefs }) {
  const all = changedKeys(c.current ?? {}, c.proposed ?? {});
  const keys = all.filter((k) => !SYSTEM_KEYS.has(k));
  const bookkeeping = all.filter((k) => SYSTEM_KEYS.has(k));
  const name = titleOf(c.proposed ?? c.current ?? {}, c.sourceId);
  const open = c.state === "waiting" || c.state === "defer";
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={c.state === "reject" ? "destructive" : c.state === "approve" ? "default" : "outline"}>
          {COPY.changes.states[c.state]}
        </Badge>
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">{collectionLabel(reviewCollectionOf(c.collection))}</span>
        <span className="font-mono text-xs text-muted-foreground">{c.sourceId}</span>
        {c.decidedAt ? (
          <span className="text-sm text-muted-foreground">
            {COPY.changes.decidedBy(c.decidedByName ?? c.decidedBy ?? "—")} · <LocalTime iso={c.decidedAt} preset="dateTime" />
          </span>
        ) : null}
      </div>
      {c.note ? <p className="text-sm">— {c.note}</p> : null}

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{bookkeeping.length ? COPY.changes.onlyBookkeeping : COPY.changes.noFieldChange}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="w-40 px-3 py-2 font-medium">{COPY.changes.field}</th>
                <th className="w-1/2 px-3 py-2 font-medium">{COPY.changes.current}</th>
                <th className="w-1/2 px-3 py-2 font-medium">{COPY.changes.proposed}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-muted-foreground">{labelOf(k)}</td>
                  <td className="bg-destructive/5 px-3 py-2">
                    <ChangeValue field={k} value={c.current?.[k]} refs={refs} />
                  </td>
                  <td className="bg-emerald-500/5 px-3 py-2">
                    <ChangeValue field={k} value={c.proposed?.[k]} refs={refs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookkeeping.length > 0 && keys.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {COPY.changes.bookkeeping(bookkeeping.length)}: {bookkeeping.map(labelOf).join(", ")}
        </p>
      ) : null}

      {canDecide && open ? <LibraryChangeDecision item={c.item} /> : null}
    </li>
  );
}

/** One side of a changed field; a rule's logic (`when`) reads as sentences. */
function ChangeValue({ field, value, refs }: { field: string; value: unknown; refs?: SpecRefs }) {
  if (field === "when") return <RuleLogic body={{ when: value }} refs={refs} />;
  return <SpecValue value={value} refs={refs} />;
}
