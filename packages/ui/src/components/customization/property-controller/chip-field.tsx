"use client";

import { useState } from "react";
import type { ChipItem, ValuesPerItem } from "../types";
import { chipClass } from "./field-styles";

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
    >
      {chips.map((c) => {
        const on = selected.includes(c.id);
        return (
          <span
            key={c.id}
            role={valuesPerItem === "one" ? "radio" : "checkbox"}
            aria-checked={on}
            tabIndex={0}
            className={chipClass(on)}
            onClick={() => toggle(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(c.id);
              }
            }}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
