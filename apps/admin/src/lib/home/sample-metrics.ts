/**
 * Placeholder home metrics.
 *
 * Replace this module when analytics is wired:
 * - GA4 — sessions and conversion rate
 * - PostHog — product and customization popularity
 * - request adapter — new lead counts; leads by sales = group by assigned owner
 *
 * Do not read these numbers as live operations data.
 */

export type HomeMetricDirection = "up" | "down";

export type HomeMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  direction: HomeMetricDirection;
};

export type HomeChartPoint = {
  label: string;
  value: number;
};

/** Dual-series day/week points for compare line charts. */
export type HomeSeriesPoint = {
  label: string;
  current: number;
  previous: number;
};

export type HomeActionItem = {
  id: string;
  label: string;
  detail?: string;
};

export const HOME_METRICS: readonly HomeMetric[] = [
  {
    id: "sessions",
    label: "Sessions",
    value: "12.4K",
    delta: "+18%",
    direction: "up",
  },
  {
    id: "leads",
    label: "New leads",
    value: "46",
    delta: "+21%",
    direction: "up",
  },
  {
    id: "requests",
    label: "Requests",
    value: "38",
    delta: "+9%",
    direction: "up",
  },
  {
    id: "conversion",
    label: "Conversion rate",
    value: "3.1%",
    delta: "−4%",
    direction: "down",
  },
];

/** New leads by day — this week vs last week. Sums toward the sample “46” story. */
export const HOME_LEADS_TREND: readonly HomeSeriesPoint[] = [
  { label: "Sep 28", current: 5, previous: 4 },
  { label: "Sep 29", current: 7, previous: 5 },
  { label: "Sep 30", current: 6, previous: 6 },
  { label: "Oct 1", current: 8, previous: 5 },
  { label: "Oct 2", current: 9, previous: 7 },
  { label: "Oct 3", current: 6, previous: 6 },
  { label: "Oct 4", current: 5, previous: 5 },
];

/** Leads by assigned sales owner. Later: request adapter group-by. */
export const HOME_LEADS_BY_SALES: readonly HomeChartPoint[] = [
  { label: "Alex Chen", value: 18 },
  { label: "Sam Rivera", value: 14 },
  { label: "Priya Nair", value: 9 },
  { label: "Jordan Lee", value: 5 },
];

/** Product requests by week — this period vs prior. Mailer boxes lead the story. */
export const HOME_PRODUCT_REQUESTS_TREND: readonly HomeSeriesPoint[] = [
  { label: "Week 1", current: 4, previous: 3 },
  { label: "Week 2", current: 6, previous: 4 },
  { label: "Week 3", current: 5, previous: 5 },
  { label: "Week 4", current: 8, previous: 6 },
  { label: "Week 5", current: 7, previous: 5 },
  { label: "Week 6", current: 9, previous: 6 },
];

export const HOME_POPULAR_PRODUCTS: readonly HomeChartPoint[] = [
  { label: "Mailer boxes", value: 22 },
  { label: "Folding cartons", value: 17 },
  { label: "Rigid boxes", value: 11 },
  { label: "Paper bags", value: 8 },
];

/** Month-to-date leads vs prior month (performance preset). */
export const HOME_MONTH_LEADS_TREND: readonly HomeSeriesPoint[] = [
  { label: "Week 1", current: 11, previous: 9 },
  { label: "Week 2", current: 14, previous: 11 },
  { label: "Week 3", current: 12, previous: 13 },
  { label: "Week 4", current: 16, previous: 12 },
];

export const HOME_PERFORMANCE_KPIS: readonly HomeMetric[] = [
  {
    id: "quotes",
    label: "Quotes sent",
    value: "27",
    delta: "+12%",
    direction: "up",
  },
  {
    id: "win-rate",
    label: "Win rate",
    value: "34%",
    delta: "+3%",
    direction: "up",
  },
  {
    id: "response",
    label: "Avg response",
    value: "4.2h",
    delta: "−18%",
    direction: "up",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    value: "$186K",
    delta: "+9%",
    direction: "up",
  },
];

export const HOME_PERFORMANCE_ACTIONS: readonly HomeActionItem[] = [
  {
    id: "follow-quotes",
    label: "Follow up 4 open quotes",
    detail: "Oldest is 6 days waiting",
  },
  {
    id: "stalled",
    label: "Review 2 stalled requests",
    detail: "No buyer reply in 10+ days",
  },
  {
    id: "samples",
    label: "Send samples for Acme Co.",
    detail: "Promised by Friday",
  },
];

export const HOME_LEAD_REVIEW_ACTIONS: readonly HomeActionItem[] = [
  {
    id: "northwind",
    label: "Northwind Foods — mailer RFQ",
    detail: "New · 2h ago",
  },
  {
    id: "brightbox",
    label: "BrightBox — rigid sample pack",
    detail: "New · 5h ago",
  },
  {
    id: "leaf",
    label: "Leaf & Co. — folding carton quote",
    detail: "Needs owner assign",
  },
];

export const HOME_PRODUCT_KPIS: readonly HomeMetric[] = [
  HOME_METRICS[0]!,
  HOME_METRICS[2]!,
  HOME_METRICS[3]!,
];
