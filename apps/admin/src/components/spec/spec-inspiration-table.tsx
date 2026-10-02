"use client";

import { useMemo, useState } from "react";
import { Input } from "@pakfactory/ui/components/input";
import type { BrowseInspiration } from "@/lib/spec/solution-browse";
import { ADMIN_SPEC_PRODUCTS_COPY, ADMIN_SPEC_SOLUTIONS_COPY as COPY } from "@/lib/copy/spec";

const PAGE = 50;

/**
 * Every inspiration product: its base standard product and its primary solution. All rows
 * arrive so the filter searches the whole list; only drawing them is paged.
 */
export function SpecInspirationTable({ rows }: { rows: BrowseInspiration[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title, r.registry?.entityCode, r.base?.title, r.base?.code, r.primarySolution].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder={COPY.filterInspirations}
          className="max-w-sm"
          aria-label="Filter inspiration products"
        />
        <span className="text-sm tabular-nums text-muted-foreground">
          {query.trim() ? `${filtered.length} of ${rows.length}` : COPY.inspirationsCount(rows.length)}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{COPY.columns.product}</th>
                <th className="px-3 py-2 font-medium">{COPY.columns.code}</th>
                <th className="px-3 py-2 font-medium">{COPY.columns.base}</th>
                <th className="px-3 py-2 font-medium">{COPY.columns.solution}</th>
                <th className="px-3 py-2 font-medium">{COPY.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((r) => (
                <tr key={r.id} className="border-t border-border align-baseline">
                  <td className="px-3 py-1.5 text-foreground">
                    {r.studioUrl ? (
                      <a href={r.studioUrl} target="_blank" rel="noreferrer" className="hover:underline" title={COPY.editInStudio}>
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <Code value={r.registry?.entityCode} />
                  </td>
                  <td className="px-3 py-1.5">
                    {r.base ? (
                      <span className="flex flex-col">
                        <span className="text-foreground">{r.base.title}</span>
                        <Code value={r.base.code} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-foreground">{r.primarySolution ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                    {COPY.status(r.status)} · {COPY.publish(r.state)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="self-start text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {ADMIN_SPEC_PRODUCTS_COPY.loadMore(Math.min(PAGE, filtered.length - limit), filtered.length - limit)}
        </button>
      )}
    </div>
  );
}

function Code({ value }: { value?: string }) {
  return value ? (
    <code className="font-mono text-xs text-muted-foreground">{value}</code>
  ) : (
    <span className="text-xs text-muted-foreground">{COPY.notRegistered}</span>
  );
}
