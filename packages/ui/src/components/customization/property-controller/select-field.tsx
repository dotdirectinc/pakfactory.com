"use client";

import { inputClass } from "./field-styles";

export function SelectField({
  choices,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Select…",
}: {
  choices: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      className={inputClass}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {choices.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
