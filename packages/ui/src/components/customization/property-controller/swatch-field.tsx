"use client";

import {useState, type CSSProperties} from "react";
import {cn} from "../../../lib/utils";
import type {SwatchItem} from "../types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../tooltip";

/** Hue wheel for Custom Color — no image/token fill. */
const CUSTOM_COLOR_WHEEL: CSSProperties = {
  backgroundImage:
    "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
};

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
        const isCustomColor = s.appearance === "customColor";
        const style: CSSProperties | undefined = isConsultation
          ? undefined
          : isCustomColor
            ? CUSTOM_COLOR_WHEEL
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
                  "hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isConsultation
                    ? "border-[3px] border-dotted border-muted-foreground bg-transparent"
                    : "border border-border bg-cover bg-center",
                  on &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background hover:opacity-100",
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
