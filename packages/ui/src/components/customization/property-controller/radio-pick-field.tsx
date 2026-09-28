"use client";

import {useState} from "react";
import {cn} from "../../../lib/utils";
import {DimensionInputs} from "./dimension-field";
import {chipClass, inputClass} from "./field-styles";

export function RadioPickField({
  choices,
  pick,
  unit,
  value: controlled,
  defaultValue,
  onChange,
}: {
  choices: string[];
  pick: string[];
  unit: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue ?? choices[0] ?? "");
  const value = controlled ?? internal;
  const setValue = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => {
          const on = c === value;
          return (
            <span
              key={c}
              role="button"
              tabIndex={0}
              className={cn(chipClass(on), "inline-flex items-center gap-2")}
              onClick={() => setValue(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setValue(c);
                }
              }}
            >
              <span
                className={cn(
                  "inline-block size-3 shrink-0 rounded-full border border-current",
                  on && "bg-current",
                )}
              />
              {c}
            </span>
          );
        })}
      </div>
      <div className={cn("mt-2", value === "Stock size" ? "block" : "hidden")}>
        <select className={inputClass} defaultValue={pick[0]}>
          {pick.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className={cn("mt-2", value === "Custom" ? "block" : "hidden")}>
        <DimensionInputs unit={unit} />
      </div>
    </>
  );
}
