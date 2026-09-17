"use client";

import { cn } from "../../../lib/utils";
import { hintClass, inputClass } from "./field-styles";

function DimsInputs({ unit }: { unit: string }) {
  const axes = [
    ["L", "Length"],
    ["W", "Width"],
    ["H", "Height"],
  ] as const;
  return (
    <div className="flex gap-2">
      {axes.map(([pre, label]) => (
        <div key={pre} className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
            {pre}
          </span>
          <input
            type="number"
            min={0}
            placeholder="0"
            aria-label={label}
            className={cn(inputClass, "px-7")}
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DimsField({
  unit,
  showHint = true,
}: {
  unit: string;
  showHint?: boolean;
}) {
  return (
    <>
      <DimsInputs unit={unit} />
      {showHint ? (
        <div className={hintClass}>
          Try typing values — prefixes keep L/W/H clear.
        </div>
      ) : null}
    </>
  );
}

export { DimsInputs };
