"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { ToggleItem } from "../types";
import { hintClass } from "./field-styles";

export function TogglesField({
  items,
  hint,
  value: controlled,
  onChange,
}: {
  items: ToggleItem[];
  hint?: string;
  value?: boolean[];
  onChange?: (value: boolean[]) => void;
}) {
  const [internal, setInternal] = useState(items.map((i) => i.value));
  const states = controlled ?? internal;
  const setStates = (next: boolean[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const on = states[i] ?? false;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm">{item.label}</span>
              <span className="inline-flex items-center gap-2">
                <span
                  role="switch"
                  aria-checked={on}
                  tabIndex={0}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border transition-colors",
                    on ? "border-primary bg-primary" : "bg-muted",
                  )}
                  onClick={() => {
                    const next = [...states];
                    next[i] = !next[i];
                    setStates(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const next = [...states];
                      next[i] = !next[i];
                      setStates(next);
                    }
                  }}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-3.5 rounded-full bg-background shadow transition-transform",
                      on && "translate-x-4",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-8 text-xs text-muted-foreground",
                    on && "text-primary",
                  )}
                >
                  {on ? "Yes" : "No"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {hint ? <div className={hintClass}>{hint}</div> : null}
    </>
  );
}
