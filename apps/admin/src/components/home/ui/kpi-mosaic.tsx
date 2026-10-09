import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import {
  MetricStat,
  type MetricStatDirection,
} from "@/components/home/ui/metric-stat";

export type KpiMosaicItem = {
  id: string;
  label: string;
  value: string;
  delta: string;
  direction: MetricStatDirection;
};

export type KpiMosaicProps = {
  title: string;
  items: readonly KpiMosaicItem[];
};

/** Props-only KPI tile grid inside a card. */
export function KpiMosaic({ title, items }: KpiMosaicProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-base leading-snug font-semibold tracking-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <MetricStat
              key={item.id}
              label={item.label}
              value={item.value}
              delta={item.delta}
              direction={item.direction}
              className="items-start"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
