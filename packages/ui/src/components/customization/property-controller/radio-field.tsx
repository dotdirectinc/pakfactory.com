"use client";

import {useState} from "react";
import {cn} from "../../../lib/utils";
import {chipClass} from "./field-styles";
import {RadioChoiceMark} from "./radio-choice-mark";

export function RadioField({
  choices,
  value: controlled,
  defaultValue,
  onChange,
}: {
  choices: string[];
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
  );
}
