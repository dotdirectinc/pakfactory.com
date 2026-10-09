"use client";

import {useId, useState} from "react";
import {cn} from "../../../lib/utils";
import type {ToggleItem} from "../types";
import {hintClass} from "./field-styles";

function YesNoSegment({
  on,
  onChange,
  labelledBy,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
}) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="relative inline-grid grid-cols-2 rounded-full bg-muted p-1"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!on);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onChange(false);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onChange(true);
        }
      }}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-200",
          on && "translate-x-[calc(100%+0.25rem)]",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        className={cn(
          "relative z-10 min-w-10 cursor-pointer px-3 py-1 text-center text-xs transition-colors",
          !on ? "font-medium text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        tabIndex={-1}
        className={cn(
          "relative z-10 min-w-10 cursor-pointer px-3 py-1 text-center text-xs transition-colors",
          on ? "font-medium text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
    </div>
  );
}

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
  const baseId = useId();
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
          const labelId = `${baseId}-${i}`;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4"
            >
              <span id={labelId} className="text-sm text-foreground">
                {item.label}
              </span>
              <YesNoSegment
                on={on}
                labelledBy={labelId}
                onChange={(next) => {
                  const copy = [...states];
                  copy[i] = next;
                  setStates(copy);
                }}
              />
            </div>
          );
        })}
      </div>
      {hint ? <div className={hintClass}>{hint}</div> : null}
    </>
  );
}
