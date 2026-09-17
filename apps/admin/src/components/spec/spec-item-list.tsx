"use client";

import { useMemo, useState } from "react";
import { Input } from "@pakfactory/ui/components/input";
import type { ChangesetItem } from "@/lib/spec/registry-api";

/**
 * Every row the frame would write, as a sentence.
 *
 * This is the part an approver actually reviews. Counts tell you the size of a change,
 * not whether it is right — "831 availability rows" is something you assent to, whereas
 * "Rigid Boxes offers Chipboards" is something you can check against the board.
 *
 * All of them are rendered rather than paged: the reviewer's question is usually "is
 * THIS line here", and a filter over the whole set answers it in one step, where paging
 * would make them hunt. The largest frame is ~1,300 rows, which a browser handles.
 */
export function SpecItemList({ items }: { items: ChangesetItem[] }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      items.map((i) => ({
        key: i.id ?? i.deterministic_key,
        text: i.describe ?? `${i.op} ${i.entity_type}`,
        op: i.op,
      })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.text.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter these changes — a product, a material, an option…"
          className="max-w-sm"
          aria-label="Filter changes"
        />
        <span className="text-sm text-muted-foreground tabular-nums">
          {query
            ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}`
            : `${rows.length.toLocaleString()} changes`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          Nothing in this frame matches “{query}”.
        </p>
      ) : (
        <ol className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-md border border-border">
          {filtered.map((r) => (
            <li key={r.key} className="flex items-baseline gap-2 px-3 py-1.5 text-sm">
              {r.op !== "insert" ? (
                <span className="shrink-0 text-xs uppercase tracking-wide text-destructive">
                  {r.op}
                </span>
              ) : null}
              <span className="text-foreground">{r.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
