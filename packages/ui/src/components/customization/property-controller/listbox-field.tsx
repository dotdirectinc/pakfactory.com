"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { hintClass } from "./field-styles";

export function ListboxField({
  choices,
  multi,
  exclusive,
  value: controlled,
  defaultValue,
  defaultValues,
  onChange,
  hint,
}: {
  choices: string[];
  multi?: boolean;
  exclusive?: string;
  value?: string[];
  defaultValue?: string;
  defaultValues?: string[];
  onChange?: (value: string[]) => void;
  hint?: string;
}) {
  const [internal, setInternal] = useState<string[]>(() =>
    multi
      ? [...(defaultValues ?? [])]
      : defaultValue
        ? [defaultValue]
        : [],
  );
  const selected = controlled ?? internal;
  const setSelected = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  const boxRef = useRef<HTMLDivElement>(null);
  const [hideHint, setHideHint] = useState(false);

  useEffect(() => {
    const lb = boxRef.current;
    if (!lb) return;
    if (lb.scrollHeight <= lb.clientHeight + 1) setHideHint(true);
  }, [choices]);

  const dflt = multi
    ? "Scroll for the full list — multiple selections allowed."
    : "Scroll for the full list — one selection only.";

  function pickSingle(c: string) {
    setSelected([c]);
  }

  function toggleMulti(c: string) {
    const on = !selected.includes(c);
    if (!on) {
      setSelected(selected.filter((x) => x !== c));
      return;
    }
    if (!exclusive) {
      setSelected([...selected, c]);
      return;
    }
    const clickedIsEx = c === exclusive;
    if (clickedIsEx) {
      setSelected([exclusive]);
      return;
    }
    setSelected(selected.filter((x) => x !== exclusive).concat(c));
  }

  return (
    <>
      <div
        ref={boxRef}
        className="max-h-[200px] overflow-y-auto rounded-[var(--radius-control)] border border-border"
        data-excl={exclusive}
        data-multi={multi || undefined}
      >
        {choices.map((c) => {
          const on = selected.includes(c);
          return (
            <div
              key={c}
              role="option"
              aria-selected={on}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                on && "bg-primary/10 text-primary",
              )}
              onClick={() => (multi ? toggleMulti(c) : pickSingle(c))}
            >
              <span
                className={cn(
                  "inline-block size-3 shrink-0 border border-current",
                  multi ? "rounded-sm" : "rounded-full",
                  on && "bg-current",
                )}
              />
              {c}
            </div>
          );
        })}
      </div>
      {!hideHint ? <div className={hintClass}>{hint || dflt}</div> : null}
    </>
  );
}
