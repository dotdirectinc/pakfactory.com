"use client";

import {useState} from "react";
import {Button} from "../../button";
import {Input} from "../../input";

export function RepeatField({
  placeholder,
  addLabel = "+ Add another code",
  value: controlled,
  defaultValue,
  onChange,
}: {
  placeholder: string;
  addLabel?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}) {
  const [internal, setInternal] = useState<string[]>(() =>
    defaultValue?.length ? [...defaultValue] : [""],
  );
  const rows = controlled ?? internal;

  const setRows = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i}>
            <Input
              placeholder={placeholder}
              value={row}
              onChange={(e) => {
                const next = [...rows];
                next[i] = e.target.value;
                setRows(next);
              }}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setRows([...rows, ""])}
      >
        {addLabel}
      </Button>
    </>
  );
}
