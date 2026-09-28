"use client";

import {useState} from "react";
import {cn} from "../../../lib/utils";
import {chipClass} from "./field-styles";

function CheckChip({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const [internal, setInternal] = useState(false);
  const on = checked ?? internal;
  const setOn = (next: boolean) => {
    if (checked === undefined) setInternal(next);
    onCheckedChange?.(next);
  };

  return (
    <span
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      className={cn(chipClass(on), "inline-flex items-center gap-2")}
      onClick={() => setOn(!on)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOn(!on);
        }
      }}
    >
      <span
        className={cn(
          "inline-block size-3 shrink-0 rounded-sm border border-current",
          on && "bg-current",
        )}
      />
      {label}
    </span>
  );
}

export function ChecksField({
  choices,
  value: controlled,
  defaultValue,
  onChange,
}: {
  choices: string[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}) {
  const [internal, setInternal] = useState<string[]>(() => [
    ...(defaultValue ?? []),
  ]);
  const selected = controlled ?? internal;

  const setSelected = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  const toggle = (choice: string) => {
    if (selected.includes(choice)) {
      setSelected(selected.filter((c) => c !== choice));
      return;
    }
    setSelected([...selected, choice]);
  };

  return (
    <div className="flex flex-wrap gap-2" role="group">
      {choices.map((c) => (
        <CheckChip
          key={c}
          label={c}
          checked={selected.includes(c)}
          onCheckedChange={() => toggle(c)}
        />
      ))}
    </div>
  );
}
