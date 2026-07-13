"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pakfactory/ui/components/select";

export type PerPageOption = {
  size: number;
  href: string;
};

type PerPageSelectProps = {
  value: number;
  options: PerPageOption[];
};

/**
 * Controlled per-page selector — callers supply option hrefs so this stays
 * route-agnostic (ADR-013). Changing size navigates to the matching href
 * (typically page 1 of the listing with the new size).
 */
export function PerPageSelect({ value, options }: PerPageSelectProps) {
  const router = useRouter();

  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const option = options.find((o) => String(o.size) === next);
        if (option) router.push(option.href);
      }}
    >
      <SelectTrigger
        aria-label="Posts per page"
        className="h-9 w-[110px] rounded-md border border-border bg-background text-sm text-muted-foreground shadow-none hover:text-foreground"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.size} value={String(option.size)}>
            {option.size}/page
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
