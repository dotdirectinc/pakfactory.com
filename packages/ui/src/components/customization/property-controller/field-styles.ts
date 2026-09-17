import { cn } from "../../../lib/utils";

export const chipClass = (on: boolean) =>
  cn(
    "cursor-pointer rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm",
    on && "border-primary bg-primary text-primary-foreground",
  );

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-background px-2 py-2 text-sm";

export const hintClass = "mt-2 text-xs text-muted-foreground";
