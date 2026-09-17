"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "../../../lib/utils";
import type { SwatchItem } from "../types";

export function SwatchField({
  swatches,
  value: controlled,
  defaultValue,
  onChange,
}: {
  swatches: SwatchItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(
    defaultValue ?? swatches[0]?.id ?? "",
  );
  const selected = controlled ?? internal;
  const setSelected = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Swatches">
      {swatches.map((s) => {
        const on = selected === s.id;
        const style: CSSProperties = s.imageUrl
          ? { backgroundImage: `url(${s.imageUrl})` }
          : { backgroundColor: s.color ?? "var(--muted)" };
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-control)] border border-border bg-background p-2 text-sm",
              on && "border-primary bg-primary/10 text-primary",
            )}
            onClick={() => setSelected(s.id)}
          >
            <span
              className="size-8 rounded-full border border-border bg-cover bg-center"
              style={style}
            />
            <span className="text-xs">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
