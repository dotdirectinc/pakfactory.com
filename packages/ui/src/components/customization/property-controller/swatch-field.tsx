"use client";

import {useState, type CSSProperties} from "react";
import {cn} from "../../../lib/utils";
import type {SwatchItem} from "../types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../tooltip";

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
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Swatches">
      {swatches.map((s) => {
        const on = selected === s.id;
        const isConsultation = s.appearance === "consultation";
        const style: CSSProperties | undefined = isConsultation
          ? undefined
          : s.imageUrl
            ? {backgroundImage: `url(${s.imageUrl})`}
            : {backgroundColor: s.color ?? "var(--muted)"};
        return (
          <Tooltip key={s.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={s.label}
                className={cn(
                  "size-9 shrink-0 cursor-pointer rounded-full transition-shadow",
                  isConsultation
                    ? "border-[3px] border-dotted border-muted-foreground bg-transparent"
                    : "border border-border bg-cover bg-center",
                  on &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  on && !isConsultation && "border-transparent",
                )}
                style={style}
                onClick={() => setSelected(s.id)}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {s.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
