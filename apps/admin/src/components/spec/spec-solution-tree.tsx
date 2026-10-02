"use client";

import { useMemo, useState } from "react";
import { Input } from "@pakfactory/ui/components/input";
import type { BrowseInspiration, BrowseSolution, BrowseStyle } from "@/lib/spec/solution-browse";
import { ADMIN_SPEC_SOLUTIONS_COPY as COPY } from "@/lib/copy/spec";

const matches = (q: string, title: string, code?: string) =>
  title.toLowerCase().includes(q) || (code ?? "").toLowerCase().includes(q);

/**
 * Every solution with its solution styles and its inspiration products. A solution that matches
 * keeps everything under it; otherwise only the matching styles and products show.
 */
export function SpecSolutionTree({ solutions }: { solutions: BrowseSolution[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return solutions;
    return solutions
      .map((s) =>
        matches(q, s.title, s.registry?.entityCode)
          ? s
          : {
              ...s,
              styles: s.styles.filter((x) => matches(q, x.title, x.registry?.entityCode)),
              inspirations: s.inspirations.filter((x) => matches(q, x.title, x.registry?.entityCode)),
            },
      )
      .filter((s) => s.styles.length + s.inspirations.length > 0 || matches(q, s.title, s.registry?.entityCode));
  }, [solutions, q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.filterSolutions}
          className="max-w-sm"
          aria-label="Filter solutions"
        />
        <span className="text-sm tabular-nums text-muted-foreground">
          {q ? `${filtered.length} of ${solutions.length}` : COPY.solutionsCount(solutions.length)}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        filtered.map((s) => (
          <details key={s.id || "none"} open={Boolean(q)} className="rounded-md border border-border">
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 bg-muted/40 px-3 py-2 text-sm">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-foreground">{s.title}</span>
                {s.id && <Code value={s.registry?.entityCode} />}
                {s.solutionType && <span className="text-xs text-muted-foreground">{COPY.solutionType(s.solutionType)}</span>}
                {s.state !== "published" && <span className="text-xs text-muted-foreground">{COPY.publish(s.state)}</span>}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {COPY.stylesCount(s.styles.length)} · {COPY.inspirationsCount(s.inspirations.length)}
                {s.id && !s.hasPage && ` · ${COPY.noPage}`}
              </span>
            </summary>
            <Section heading={COPY.stylesHeading} empty={COPY.noStyles} rows={s.styles} />
            <Section heading={COPY.inspirationsHeading} empty={COPY.noInspirations} rows={s.inspirations} />
          </details>
        ))
      )}
    </div>
  );
}

function Section({ heading, empty, rows }: { heading: string; empty: string; rows: (BrowseStyle | BrowseInspiration)[] }) {
  return (
    <div className="border-t border-border">
      <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">{heading}</p>
      {rows.length === 0 ? (
        <p className="px-3 pb-2 pt-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border first:border-t-0">
                  <td className="px-3 py-1.5 text-foreground">{r.title}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <Code value={r.registry?.entityCode} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                    {"status" in r ? `${COPY.status(r.status)} · ` : ""}
                    {COPY.publish(r.state)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Code({ value }: { value?: string }) {
  return value ? (
    <code className="font-mono text-xs font-normal text-muted-foreground">{value}</code>
  ) : (
    <span className="text-xs font-normal text-muted-foreground">{COPY.notRegistered}</span>
  );
}
