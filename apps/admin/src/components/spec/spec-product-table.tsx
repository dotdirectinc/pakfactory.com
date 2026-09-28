"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@pakfactory/ui/components/input";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY } from "@/lib/copy/spec";

import type { ProductListRow } from "@/lib/spec/cached-views";

export type { ProductListRow };

const PAGE = 50;

/**
 * Every standard product. All rows arrive (~60 KB) so the filter searches the whole list;
 * only drawing them is paged — 50, then "Load more".
 */
export function SpecProductTable({ rows }: { rows: ProductListRow[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.line.toLowerCase().includes(q));
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
          placeholder={COPY.filter}
          className="max-w-sm"
          aria-label="Filter products"
        />
        <span className="text-sm tabular-nums text-muted-foreground">
          {query ? `${filtered.length} of ${rows.length}` : `${rows.length} products`}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{COPY.columns.product}</th>
                <th className="px-3 py-2 font-medium">{COPY.columns.line}</th>
                <th className="px-3 py-2 text-right font-medium">{COPY.columns.listed}</th>
                <th className="px-3 py-2 text-right font-medium">{COPY.columns.derived}</th>
                <th className="px-3 py-2 text-right font-medium">{COPY.columns.exceptions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/spec/products/${encodeURIComponent(r.id)}`} className="font-medium text-foreground hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.line || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.listed}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.derived}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.exceptions || "—"}</td>
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
          className="self-center rounded-md border border-border px-4 py-1.5 text-sm text-foreground hover:bg-muted"
        >
          {COPY.loadMore(Math.min(PAGE, filtered.length - limit), filtered.length - limit)}
        </button>
      )}
    </div>
  );
}
