import {cn} from "../../../lib/utils";

/** Filled selected chrome for radio / checks / radioPick / specTable (not ChipField). */
export const chipClass = (on: boolean) =>
  cn(
    "cursor-pointer rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "border-border bg-background",
    "hover:bg-muted/60",
    on &&
      "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
  );

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-background px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const hintClass = "mt-2 text-xs text-muted-foreground";
