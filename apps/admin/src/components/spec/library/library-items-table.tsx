"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Button } from "@pakfactory/ui/components/button";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { LibraryDecisionForm } from "@/components/spec/library/library-decision-form";
import type { LibraryItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

type Props = {
  version: number;
  collection: string;
  items: LibraryItem[];
  canDecide: boolean;
};

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approve: "default",
  reject: "destructive",
  defer: "secondary",
};

/**
 * One page of a collection (PFP-124). With `spec.review`, rows can be selected and decided together —
 * about 1,400 records is too many to open one by one, so the reviewer filters, checks the page and
 * approves it, and opens only the records that need a closer look.
 */
export function LibraryItemsTable({ version, collection, items, canDecide }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allOnPage = items.length > 0 && items.every((i) => selected.has(i.sourceId));

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (items.length === 0) return <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.empty}</p>;

  return (
    <div className="flex flex-col gap-3">
      {canDecide && selected.size > 0 ? (
        <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-md border border-border bg-background p-3 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-medium">
            {COPY.selected(selected.size)}
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
              {COPY.clearSelection}
            </Button>
          </div>
          <LibraryDecisionForm
            version={version}
            items={[...selected].map((sourceId) => ({ collection, sourceId }))}
            onDone={() => setSelected(new Set())}
            compact
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {canDecide ? (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allOnPage}
                    onCheckedChange={(v) => setSelected(v ? new Set(items.map((i) => i.sourceId)) : new Set())}
                    aria-label={COPY.selectPage}
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 font-medium">{COPY.itemColumns.id}</th>
              <th className="px-3 py-2 font-medium">{COPY.itemColumns.label}</th>
              <th className="px-3 py-2 font-medium">{COPY.itemColumns.state}</th>
              <th className="px-3 py-2 font-medium">{COPY.itemColumns.note}</th>
              <th className="px-3 py-2 font-medium">{COPY.itemColumns.by}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.sourceId} className="border-t border-border align-top">
                {canDecide ? (
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selected.has(i.sourceId)}
                      onCheckedChange={(v) => toggle(i.sourceId, v === true)}
                      aria-label={i.sourceId}
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2 font-mono text-xs">
                  <Link
                    href={`/spec/library/${version}/${collection}/${encodeURIComponent(i.sourceId)}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {i.sourceId}
                  </Link>
                </td>
                <td className="px-3 py-2">{i.label ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={STATE_VARIANT[i.state] ?? "outline"}>{COPY.states[i.state] ?? i.state}</Badge>
                </td>
                <td className="max-w-xs px-3 py-2 text-muted-foreground">{i.note ?? ""}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {i.decidedByName ?? ""}
                  {i.decidedAt ? (
                    <>
                      {" · "}
                      <LocalTime iso={i.decidedAt} preset="dateTime" />
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
