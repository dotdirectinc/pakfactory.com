"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { SpecSegment } from "../types";
import { chipClass } from "./field-styles";

export function SpecTableField({
  segments,
  columns,
  rows,
  value: controlled,
  defaultValue,
  onChange,
}: {
  segments: SpecSegment[];
  columns: string[];
  rows: Record<string, string[]>;
  value?: string;
  defaultValue?: string;
  onChange?: (segmentId: string) => void;
}) {
  const [internal, setInternal] = useState(
    defaultValue ?? segments[0]?.id ?? "",
  );
  const seg = controlled ?? internal;
  const setSeg = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };
  // No row for Need consultation (or any unmatched id) — chips only, no dashes.
  const values = Object.prototype.hasOwnProperty.call(rows, seg)
    ? rows[seg]
    : undefined;

  return (
    <div>
      <div
        className={cn("flex flex-wrap gap-2", values ? "mb-4" : undefined)}
        role="tablist"
      >
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={seg === s.id}
            className={cn(chipClass(seg === s.id), "inline-flex items-center")}
            onClick={() => setSeg(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {values ? (
        <div className="overflow-hidden rounded-[var(--radius-control)] border border-border">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((c, index) => (
                  <th
                    key={c}
                    className={cn(
                      "border-r border-b border-border bg-muted/40 px-3 py-2 text-left font-medium last:border-r-0",
                      columns.length > 1 && index === 0 && "w-1/3",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((c, i) => (
                  <td
                    key={c}
                    className="border-r border-border px-3 py-2 break-words last:border-r-0"
                  >
                    {values[i] ?? "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
