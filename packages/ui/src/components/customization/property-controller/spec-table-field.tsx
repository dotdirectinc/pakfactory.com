"use client";

import { useState } from "react";
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
  const values = rows[seg] ?? [];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" role="tablist">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={seg === s.id}
            className={chipClass(seg === s.id)}
            onClick={() => setSeg(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="border border-border bg-muted/40 px-3 py-2 text-left font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c, i) => (
              <td key={c} className="border border-border px-3 py-2">
                {values[i] ?? "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
