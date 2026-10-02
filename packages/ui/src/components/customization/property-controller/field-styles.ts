import { cn } from "../../../lib/utils";

export const chipClass = (on: boolean, consultation = false) =>
  cn(
    "cursor-pointer rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    consultation
      ? cn(
          "border-dotted border-[3px] border-muted-foreground bg-transparent text-foreground",
          "hover:bg-muted/60",
          on && "border-foreground bg-muted hover:bg-muted",
        )
      : cn(
          "border-border bg-background",
          "hover:bg-muted/60",
          on &&
            "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        ),
  );

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-background px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const hintClass = "mt-2 text-xs text-muted-foreground";
