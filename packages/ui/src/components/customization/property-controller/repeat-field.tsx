"use client";

import { useState } from "react";
import { Button } from "../../button";
import { Input } from "../../input";

export function RepeatField({
  placeholder,
  addLabel = "+ Add another code",
}: {
  placeholder: string;
  addLabel?: string;
}) {
  const [rows, setRows] = useState(1);
  return (
    <>
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}>
            <Input placeholder={placeholder} />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setRows((n) => n + 1)}
      >
        {addLabel}
      </Button>
    </>
  );
}
