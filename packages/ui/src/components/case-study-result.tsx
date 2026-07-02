import * as React from "react";
import { cn } from "@pakfactory/ui/lib/utils";

export type CaseStudyResultProps = {
  value: string;
  metric: string;
  description?: string | null;
  className?: string;
};

export function CaseStudyResult({
  value,
  metric,
  description,
  className,
}: CaseStudyResultProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm",
        className,
      )}
    >
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 font-medium">{metric}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
