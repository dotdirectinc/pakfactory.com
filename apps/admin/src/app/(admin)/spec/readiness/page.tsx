import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { websiteLinks } from "@/lib/spec/mapping-links";
import { LINES } from "@/lib/spec/library-review";
import { groupMappings, KINDS, mappingHref } from "@/lib/spec/mapping-review";
import {
  countStatuses,
  READINESS_STATUSES,
  readinessHref,
  readinessParams,
  recordKey,
  type ReadinessStatus,
} from "@/lib/spec/readiness";
import { loadReadiness } from "@/lib/spec/readiness-data";
import type { LibraryReviewState } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_READINESS_COPY as COPY } from "@/lib/copy/spec-readiness";

export const metadata = { title: "Readiness" };

type SP = { kind?: string; line?: string; status?: string };

const STATUS_TONE: Record<ReadinessStatus, string> = {
  ready:
    "border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  mapping: WARNING_BADGE,
  library: WARNING_BADGE,
  gap: "border-destructive/50 bg-destructive/10 text-destructive",
};

const STATE_TONE: Record<LibraryReviewState, string> = {
  pending: "border-border bg-background text-muted-foreground",
  approve:
    "border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  reject: "border-destructive/50 bg-destructive/10 text-destructive",
  defer: WARNING_BADGE,
};

/**
 * Job specs → Readiness: for each website spec, its map and the production records the map uses,
 * each with its decision, and whether a job spec could be built from it with approved data only.
 * Read-only: decisions are made on Mapping review and Library review.
 */
export default async function SpecReadinessPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const p = readinessParams(await searchParams);
  const [, res, linkMap] = await Promise.all([
    requireRegistryGrant(),
    loadReadiness(p.kind, p.line),
    websiteLinks(),
  ]);
  const lineName = LINES.find((l) => l.key === p.line)?.label ?? p.line;
  const rows = res.ok ? res.rows : [];
  const counts = countStatuses(rows.map((r) => r.readiness));
  const shown = p.status
    ? rows.filter((r) => r.readiness.status === p.status)
    : rows;
  const byId = new Map(shown.map((r) => [r.item.id, r]));
  const groups = groupMappings(shown.map((r) => r.item));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader title={COPY.title} lead={COPY.lead} />

      <nav
        aria-label={COPY.lineHeading}
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        <span className="mr-1 text-muted-foreground">{COPY.lineHeading}</span>
        {LINES.filter((l) => l.key !== "all").map((l) => (
          <Link
            key={l.key}
            href={readinessHref({ kind: p.kind, line: l.key })}
            aria-current={l.key === p.line ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1",
              l.key === p.line
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <nav
        aria-label={COPY.title}
        className="flex gap-1 border-b border-border text-sm"
      >
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={readinessHref({ line: p.line, kind: k.key })}
            aria-current={k.key === p.kind ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2",
              k.key === p.kind
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      {!res.ok ? (
        <p
          role="alert"
          className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive"
        >
          {COPY.unreachable} ({res.error})
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          {COPY.noneLoaded(lineName)}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              {COPY.summary(counts.ready, rows.length)}
            </span>
            <nav
              aria-label={COPY.columns.status}
              className="flex flex-wrap items-center gap-1 text-sm"
            >
              <Link
                href={readinessHref({ ...p, status: null })}
                aria-current={p.status === null ? "page" : undefined}
                className={cn(
                  "rounded-md border px-2.5 py-0.5",
                  p.status === null
                    ? "border-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                {COPY.all} {rows.length}
              </Link>
              {READINESS_STATUSES.map((s) => (
                <Link
                  key={s.key}
                  href={readinessHref({ ...p, status: s.key })}
                  title={s.hint}
                  aria-current={p.status === s.key ? "page" : undefined}
                  className={cn(
                    "rounded-md border px-2.5 py-0.5",
                    p.status === s.key
                      ? "border-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {s.label} {counts[s.key]}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-muted-foreground">{COPY.scopeNote}</p>
          </section>

          {shown.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              {COPY.empty}
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="hidden grid-cols-[minmax(0,1fr)_10rem_minmax(0,1.6fr)_9rem] gap-4 px-3 text-xs font-medium text-muted-foreground md:grid">
                <span>{COPY.columns.website}</span>
                <span>{COPY.columns.map}</span>
                <span>{COPY.columns.production}</span>
                <span>{COPY.columns.status}</span>
              </div>
              {groups.map((g) => (
                <section key={g.key} className="flex flex-col gap-2">
                  {g.title ? (
                    <h2 className="text-sm font-semibold">{g.title}</h2>
                  ) : null}
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                    {g.items.map((item) => {
                      const { readiness: r } = byId.get(item.id)!;
                      const site = linkMap.get(item.subjectId);
                      const status = READINESS_STATUSES.find(
                        (s) => s.key === r.status,
                      )!;
                      return (
                        <li
                          key={item.id}
                          className="grid gap-3 p-3 text-sm md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1.6fr)_9rem] md:gap-4"
                        >
                          <div className="flex min-w-0 flex-col">
                            {site ? (
                              <Link
                                href={site.href}
                                className="truncate font-medium underline-offset-2 hover:underline"
                              >
                                {item.subjectName ?? item.subjectCode}
                              </Link>
                            ) : (
                              <span
                                className="truncate font-medium"
                                title={COPY.noPage}
                              >
                                {item.subjectName ?? item.subjectCode}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.subjectCode}
                            </span>
                          </div>
                          <div className="flex flex-col items-start gap-1">
                            <Link
                              href={mappingHref({
                                kind: p.kind,
                                line: p.line,
                                state: "all",
                                search: item.subjectCode,
                              })}
                              title={COPY.openMap}
                              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                            >
                              {COPY.labels[item.label] ?? item.label}
                            </Link>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                STATE_TONE[item.state],
                              )}
                            >
                              {COPY.states[item.state]}
                            </Badge>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {r.records.length
                                ? COPY.approvedOf(r.approved, r.records.length)
                                : COPY.noRecords}
                            </span>
                            {r.records.length ? (
                              <ul className="flex flex-wrap gap-1">
                                {r.records.map((rec) => {
                                  const href = res.hrefs[recordKey(rec)];
                                  const label = rec.name ?? rec.sourceId;
                                  const cls = cn(
                                    "inline-flex max-w-full rounded-md border px-2 py-0.5 text-xs",
                                    STATE_TONE[rec.state],
                                  );
                                  return (
                                    <li
                                      key={recordKey(rec)}
                                      className="max-w-full"
                                    >
                                      {href ? (
                                        <Link
                                          href={href}
                                          title={`${rec.sourceId} · ${COPY.states[rec.state]}`}
                                          className={cn(cls, "hover:underline")}
                                        >
                                          <span className="truncate">
                                            {label}
                                          </span>
                                        </Link>
                                      ) : (
                                        <span
                                          title={`${rec.sourceId} · ${COPY.states[rec.state]}`}
                                          className={cls}
                                        >
                                          <span className="truncate">
                                            {label}
                                          </span>
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                            {r.needsCode > 0 ? (
                              <span className="text-xs text-amber-800 dark:text-amber-300">
                                {COPY.needsCode(r.needsCode)}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              title={status.hint}
                              className={cn(
                                "font-normal",
                                STATUS_TONE[r.status],
                              )}
                            >
                              {status.label}
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
