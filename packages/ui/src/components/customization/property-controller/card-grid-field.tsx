"use client";

import {useState} from "react";
import {CheckIcon} from "lucide-react";
import {cn} from "../../../lib/utils";
import type {CardItem} from "../types";

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
              "relative cursor-pointer rounded-[var(--radius-control)] border border-border bg-background p-3 text-left text-sm transition-colors",
              on && "border-primary bg-muted text-foreground",
            )}
            onClick={() => setSelected(c.id)}
          >
            {on ? (
              <span
                className="absolute top-2 right-2 inline-flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden
              >
                <CheckIcon className="size-2" strokeWidth={2.5} />
              </span>
            ) : null}
            {c.imageUrl ? (
              <div className="mb-2 aspect-square overflow-hidden rounded-[var(--radius-control)] bg-muted">
                <img
                  src={c.imageUrl}
                  alt={c.imageAlt ?? c.name}
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <div className={cn("font-medium", on && "pr-4")}>{c.name}</div>
            {c.meta ? (
              <div className="mt-1 text-xs text-muted-foreground">{c.meta}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
