"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@pakfactory/ui/components/chart";
import type { PostBodyBarChart } from "@/lib/blog-post";

type BodyBarChartProps = {
  value: PostBodyBarChart;
};

// Neutral default that matches the site theme; brand accent for highlights.
const BAR_COLOR = "#dbdbe3";
const BAR_HIGHLIGHT_COLOR = "var(--primary)";

function RotatedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      transform={`rotate(-45, ${x}, ${y})`}
      fontSize={11}
      fill="var(--muted-foreground)"
    >
      {payload?.value}
    </text>
  );
}

const chartConfig = {
  value: { label: "Value", color: BAR_COLOR },
} satisfies ChartConfig;

/**
 * Inline single-series bar chart authored in the post body. Uses the shadcn
 * chart primitive (Recharts) with default styling and the theme chart token.
 * Unbounded number of points; an sr-only data table is the text alternative.
 */
export function BodyBarChart({ value }: BodyBarChartProps) {
  const data = (value.data ?? [])
    .filter((d) => typeof d.value === "number" && Number.isFinite(d.value))
    .map((d, i) => ({
      label: d.label?.trim() || `#${i + 1}`,
      value: d.value ?? 0,
      highlight: Boolean(d.highlight),
    }));
  if (data.length === 0) return null;

  const title = value.title?.trim();
  const xAxisLabel = value.xAxisLabel?.trim();
  const yAxisLabel = value.yAxisLabel?.trim();
  const source = value.source?.trim();

  const axisLabelFill = "var(--muted-foreground)";
  const manyPoints = data.length > 12;
  // Rotate labels and reduce tick density when there are many data points.
  const tickInterval = manyPoints ? Math.ceil(data.length / 10) - 1 : 0;
  const xAxisHeight = manyPoints ? 60 : xAxisLabel ? 40 : 30;

  return (
    <figure className="my-8">
      {title ? (
        <figcaption className="mb-6 text-sm font-semibold text-foreground">
          {title}
        </figcaption>
      ) : null}

      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 4, right: 8, left: 4, bottom: xAxisLabel ? 20 : 0 }}
        >
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={tickInterval}
            height={xAxisHeight}
            tick={manyPoints ? <RotatedTick /> : undefined}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -12,
                    fill: axisLabelFill,
                    fontSize: 12,
                  }
                : undefined
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yAxisLabel ? 60 : 40}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fill: axisLabelFill, fontSize: 12 },
                  }
                : undefined
            }
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <div className="min-w-[80px] rounded-lg border border-border/50 bg-background px-4 py-2.5 text-center shadow-xl">
                  <div className="text-xs font-medium text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">
                    {payload[0]?.value}
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" radius={4}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.highlight ? BAR_HIGHLIGHT_COLOR : BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <table className="sr-only">
        <caption>{title || "Bar chart data"}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {source ? (
        <p className="mt-4 text-xs text-muted-foreground">{source}</p>
      ) : null}
    </figure>
  );
}
