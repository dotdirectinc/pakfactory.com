"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@pakfactory/ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pakfactory/ui/components/chart";
import { MARK_GREEN } from "@/components/layout/logo-mark";
import type {
  HomeChartPoint,
  HomeSeriesPoint,
} from "@/lib/home/sample-metrics";

const lineConfig = {
  current: { label: "This period", color: MARK_GREEN },
  previous: {
    label: "Prior period",
    color: `color-mix(in oklab, ${MARK_GREEN} 45%, transparent)`,
  },
} satisfies ChartConfig;

const barConfig = {
  value: { label: "Count", color: MARK_GREEN },
} satisfies ChartConfig;

function SeriesTable({
  caption,
  points,
}: {
  caption: string;
  points: readonly HomeSeriesPoint[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">This period</th>
          <th scope="col">Prior period</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.label}>
            <td>{point.label}</td>
            <td>{point.current}</td>
            <td>{point.previous}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartTable({
  caption,
  points,
}: {
  caption: string;
  points: readonly HomeChartPoint[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Label</th>
          <th scope="col">Count</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.label}>
            <td>{point.label}</td>
            <td>{point.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function endCapTicks(labels: readonly string[]): string[] {
  if (labels.length === 0) return [];
  if (labels.length === 1) return [labels[0]!];
  return [labels[0]!, labels[labels.length - 1]!];
}

export type ViewReportButtonProps = {
  label: string;
  onClick: () => void;
};

export function ViewReportButton({ label, onClick }: ViewReportButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="self-start rounded-full"
      aria-disabled="true"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export type CompareLineChartProps = {
  caption: string;
  points: readonly HomeSeriesPoint[];
  reportLabel: string;
  onReportClick: () => void;
};

export function CompareLineChart({
  caption,
  points,
  reportLabel,
  onReportClick,
}: CompareLineChartProps) {
  const data = [...points];
  const ticks = endCapTicks(data.map((p) => p.label));
  const activeLabel = data[data.length - 1]?.label;

  return (
    <div className="flex flex-col gap-3">
      <ViewReportButton label={reportLabel} onClick={onReportClick} />
      <ChartContainer config={lineConfig} className="aspect-auto h-44 w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {activeLabel ? (
            <ReferenceLine
              x={activeLabel}
              stroke="var(--border)"
              strokeDasharray="2 2"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="previous"
            stroke="var(--color-previous)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="var(--color-current)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ChartContainer>
      <SeriesTable caption={caption} points={points} />
    </div>
  );
}

export type ColumnChartProps = {
  caption: string;
  points: readonly HomeChartPoint[];
  reportLabel: string;
  onReportClick: () => void;
};

export function ColumnChart({
  caption,
  points,
  reportLabel,
  onReportClick,
}: ColumnChartProps) {
  const data = points.map((point) => ({
    ...point,
    short: point.label.split(" ")[0] ?? point.label,
  }));

  return (
    <div className="flex flex-col gap-3">
      <ViewReportButton label={reportLabel} onClick={onReportClick} />
      <ChartContainer config={barConfig} className="aspect-auto h-44 w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="short"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis hide />
          <ChartTooltip
            content={<ChartTooltipContent labelKey="label" nameKey="value" />}
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ChartContainer>
      <ChartTable caption={caption} points={points} />
    </div>
  );
}
