"use client";

import {useState} from "react";
import {CheckIcon} from "lucide-react";
import {cn} from "../../../lib/utils";
import type {ChipItem, ValuesPerItem} from "../types";

export function ChipField({
  chips,
  valuesPerItem = "one",
  value: controlled,
  defaultValue,
  onChange,
}: {
  chips: ChipItem[];
  valuesPerItem?: ValuesPerItem;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}) {
  const [internal, setInternal] = useState<string[]>(
    () => defaultValue ?? (chips[0] ? [chips[0].id] : []),
  );
  const selected = controlled ?? internal;
  const setSelected = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  const toggle = (id: string) => {
    if (valuesPerItem === "one") {
      setSelected([id]);
      return;
    }
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      role={valuesPerItem === "one" ? "radiogroup" : "group"}
      aria-label="Choices"
    >
      {chips.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            role={valuesPerItem === "one" ? "radio" : "checkbox"}
            aria-checked={on}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm text-foreground transition-colors",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              on
                ? "border-primary bg-muted hover:bg-muted"
                : "border-border bg-background hover:bg-muted/60",
            )}
            onClick={() => toggle(c.id)}
          >
            {c.label}
            <span
              className={cn(
                "inline-flex size-3 shrink-0 items-center justify-center rounded-full border",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent",
              )}
              aria-hidden
            >
              {on ? <CheckIcon className="size-2" strokeWidth={2.5} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
