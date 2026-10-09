import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

export type MetricStatDirection = "up" | "down";

export type MetricStatProps = {
  label: string;
  value: string;
  delta: string;
  direction: MetricStatDirection;
  className?: string;
};

export function MetricStat({
  label,
  value,
  delta,
  direction,
  className,
}: MetricStatProps) {
  const up = direction === "up";
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            up ? "text-primary" : "text-destructive",
          )}
        >
          <Icon className="size-3" aria-hidden />
          {delta}
        </span>
      </span>
    </div>
  );
}
