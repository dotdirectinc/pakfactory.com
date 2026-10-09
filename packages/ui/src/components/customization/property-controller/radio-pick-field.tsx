"use client";

import {useState} from "react";
import {cn} from "../../../lib/utils";
import {DimensionInputs} from "./dimension-field";
import {chipClass, inputClass} from "./field-styles";
import {RadioChoiceMark} from "./radio-choice-mark";

export function RadioPickField({
  choices,
  pick,
  unit,
  value: controlled,
  defaultValue,
  onChange,
  /** Choice label that reveals the stock-size dropdown. Defaults to gallery copy. */
  revealPick = "Stock size",
  /** Choice label that reveals dimension inputs. Defaults to gallery copy. */
  revealDimensions = "Custom",
}: {
  choices: string[];
  pick: string[];
  unit: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  revealPick?: string;
  revealDimensions?: string;
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
              <RadioChoiceMark on={on} />
              {c}
            </span>
          );
        })}
      </div>
      <div className={cn("mt-2", value === revealPick ? "block" : "hidden")}>
        <select className={inputClass} defaultValue={pick[0]}>
          {pick.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div
        className={cn("mt-2", value === revealDimensions ? "block" : "hidden")}
      >
        <DimensionInputs unit={unit} />
      </div>
    </>
  );
}
