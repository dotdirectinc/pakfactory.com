"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { CardItem } from "../types";

export function CardGridField({
  cards,
  value: controlled,
  defaultValue,
  onChange,
}: {
  cards: CardItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue ?? cards[0]?.id ?? "");
  const selected = controlled ?? internal;
  const setSelected = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
      {cards.map((c) => {
        const on = selected === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn(
              "cursor-pointer rounded-[var(--radius-control)] border border-border bg-background p-3 text-left text-sm",
              on && "border-primary bg-primary/10 text-primary",
            )}
            onClick={() => setSelected(c.id)}
          >
            <div className="font-medium">{c.name}</div>
            {c.meta ? (
              <div className="mt-1 text-xs text-muted-foreground">{c.meta}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
