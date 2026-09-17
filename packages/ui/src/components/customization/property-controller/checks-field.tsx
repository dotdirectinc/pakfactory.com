"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";
import { chipClass } from "./field-styles";

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

export function ChecksField({ choices }: { choices: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((c) => (
        <CheckChip key={c} label={c} />
      ))}
    </div>
  );
}
