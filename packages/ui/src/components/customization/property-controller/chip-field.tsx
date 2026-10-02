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
      aria-label="Choices"
    >
      {chips.map((c) => {
        const on = selected.includes(c.id);
        const isConsultation = c.appearance === "consultation";
        return (
          <button
            key={c.id}
            type="button"
            role={valuesPerItem === "one" ? "radio" : "checkbox"}
            aria-checked={on}
            className={chipClass(on, isConsultation)}
            onClick={() => toggle(c.id)}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
