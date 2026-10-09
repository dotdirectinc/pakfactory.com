"use client";

export function ReadonlyField({
  value,
  /** Optional source badge (e.g. "from product page"). Omitted when unset. */
  sourceBadge,
}: {
  value: string;
  sourceBadge?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-muted/40 px-3 py-2 text-sm">
      {value}
      {sourceBadge ? (
        <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
          {sourceBadge}
        </span>
      ) : null}
    </div>
  );
}
