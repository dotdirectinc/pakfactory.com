"use client";

import { Button } from "../../button";
import { cn } from "../../../lib/utils";
import { inputClass } from "./field-styles";

export function TextUploadField({
  placeholder,
  value,
  onChange,
  uploadLabel = "Upload artwork",
  formatsHint = "PDF, AI, PNG",
}: {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  uploadLabel?: string;
  formatsHint?: string;
}) {
  return (
    <>
      <textarea
        className={cn(inputClass, "min-h-20 resize-y")}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="outline" size="sm">
          {uploadLabel}
        </Button>
        <span className="text-sm text-muted-foreground">{formatsHint}</span>
      </div>
    </>
  );
}
