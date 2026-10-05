"use client";

import { useMemo, useState } from "react";
import { Input } from "@pakfactory/ui/components/input";
import { Badge } from "@pakfactory/ui/components/badge";
import type { ChangesetItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_SANITY_ITEM_COPY as SANITY } from "@/lib/copy/spec";

/** A Sanity field value as plain text — rich text flattened — so a reviewer can read both sides. */
function plain(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((b) => {
        const children = (b as { children?: { text?: string }[] })?.children;
        return Array.isArray(children) ? children.map((c) => c.text ?? "").join("") : plain(b);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_"))
      .map(([, x]) => plain(x))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** Before → Notion, field by field, for a Sanity-bound item. */
function SanityCompare({ item }: { item: ChangesetItem }) {
  const set = (item.payload.set ?? {}) as Record<string, unknown>;
  const before = (item.payload.before ?? {}) as Record<string, unknown>;
  return (
    <details className="mt-1 w-full">
      <summary className="cursor-pointer text-xs text-muted-foreground">{SANITY.compare}</summary>
      <div className="mt-2 flex flex-col gap-3">
        {Object.keys(set).map((f) => (
          <div key={f} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">{f}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{SANITY.before}</span>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm text-foreground">{plain(before[f]) || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{SANITY.after}</span>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm text-foreground">{plain(set[f]) || "—"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

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
        item: i,
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
            <li key={r.key} className="flex flex-wrap items-baseline gap-2 px-3 py-1.5 text-sm">
              {r.op !== "insert" ? (
                <span className="shrink-0 text-xs uppercase tracking-wide text-destructive">
                  {r.op}
                </span>
              ) : null}
              <span className="text-foreground">{r.text}</span>
              {r.item.apply_state ? (
                <Badge variant={r.item.apply_state === "applied" ? "secondary" : r.item.apply_state === "pending" ? "outline" : "destructive"}>
                  {SANITY.states[r.item.apply_state]}
                </Badge>
              ) : null}
              {r.item.apply_error ? <span className="w-full text-xs text-destructive">{r.item.apply_error}</span> : null}
              {r.item.entity_type === "sanity_document" ? <SanityCompare item={r.item} /> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
