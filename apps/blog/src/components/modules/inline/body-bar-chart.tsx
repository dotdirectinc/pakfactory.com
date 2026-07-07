"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const chartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * Inline single-series bar chart authored in the post body. Uses the shadcn
 * chart primitive (Recharts) with default styling and the theme chart token.
 * Unbounded number of points; an sr-only data table is the text alternative.
 */
export function BodyBarChart({ value }: BodyBarChartProps) {
  const data = (value.data ?? [])
    .filter((d) => typeof d.value === "number" && Number.isFinite(d.value))
    .map((d, i) => ({ label: d.label?.trim() || `#${i + 1}`, value: d.value ?? 0 }));
  if (data.length === 0) return null;

  const title = value.title?.trim();
  const source = value.source?.trim();

  return (
    <figure className="my-8 rounded-lg border border-border p-6">
      {title ? (
        <figcaption className="mb-6 text-sm font-semibold text-foreground">
          {title}
        </figcaption>
      ) : null}

      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
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
