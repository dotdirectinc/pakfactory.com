"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pakfactory/ui/components/chart";
import type { PostBodyBarChart } from "@/lib/blog-post";

type BodyBarChartProps = {
  value: PostBodyBarChart;
};

// Neutral default that matches the site theme; brand accent for highlights.
const BAR_COLOR = "#D9D9D9";
const BAR_HIGHLIGHT_COLOR = "#E06D06";

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

  return (
    <figure className="my-8 rounded-lg border border-border p-6">
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
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
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
          <ChartTooltip content={<ChartTooltipContent />} />
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
