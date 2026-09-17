"use client";

import { useState } from "react";
import { Button } from "../../button";
import { Input } from "../../input";

export function StepperField({
  value: controlled,
  defaultValue = 1,
  max = 99,
  onChange,
  unitLabel = "spot colors",
}: {
  value?: number;
  defaultValue?: number;
  max?: number;
  onChange?: (value: number) => void;
  unitLabel?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = (next: number) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-8 p-0"
        onClick={() => setValue(Math.max(1, value - 1))}
      >
        –
      </Button>
      <Input value={value} data-max={max} readOnly className="w-16 text-center" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-8 p-0"
        onClick={() => setValue(Math.min(max, value + 1))}
      >
        +
      </Button>
      <span className="ml-2 text-sm text-muted-foreground">{unitLabel}</span>
    </div>
  );
}
