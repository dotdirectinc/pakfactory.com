import { Badge } from "@pakfactory/ui/components/badge";
import { MetricStat } from "@/components/home/ui/metric-stat";
import { ADMIN_HOME_COPY } from "@/lib/copy/home";
import { HOME_METRICS } from "@/lib/home/sample-metrics";

export function MetricStrip() {
  return (
    <section
      aria-label={ADMIN_HOME_COPY.rangeLabel}
      className="flex w-full flex-col items-center gap-4"
    >
      <div className="flex items-center gap-2 self-start">
        <span className="text-xs text-muted-foreground">
          {ADMIN_HOME_COPY.rangeLabel}
        </span>
        <Badge variant="outline">{ADMIN_HOME_COPY.sampleLabel}</Badge>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        {HOME_METRICS.map((metric) => (
          <MetricStat
            key={metric.id}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            direction={metric.direction}
          />
        ))}
      </div>
      <p className="max-w-3xl text-center text-xs text-muted-foreground">
        {ADMIN_HOME_COPY.sampleNote}
      </p>
    </section>
  );
}
