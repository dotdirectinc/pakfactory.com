import type { AdminHomePillId } from "@/lib/copy/home";
import {
  HOME_LEAD_REVIEW_ACTIONS,
  HOME_LEADS_BY_SALES,
  HOME_LEADS_TREND,
  HOME_MONTH_LEADS_TREND,
  HOME_PERFORMANCE_ACTIONS,
  HOME_PERFORMANCE_KPIS,
  HOME_POPULAR_PRODUCTS,
  HOME_PRODUCT_KPIS,
  HOME_PRODUCT_REQUESTS_TREND,
  type HomeActionItem,
  type HomeChartPoint,
  type HomeMetric,
  type HomeSeriesPoint,
} from "@/lib/home/sample-metrics";

export type PakAiPresetId = AdminHomePillId;

/** Columns spanned in the generated mosaic (3-col grid). */
export type PakAiMosaicSpan = "1" | "2" | "3";

type WithSpan = { span?: PakAiMosaicSpan };

export type PakAiInsightLineSpec = WithSpan & {
  kind: "insight-line";
  title: string;
  description: string;
  caption: string;
  points: readonly HomeSeriesPoint[];
};

export type PakAiInsightBarsSpec = WithSpan & {
  kind: "insight-bars";
  title: string;
  description: string;
  caption: string;
  points: readonly HomeChartPoint[];
};

export type PakAiKpiSpec = WithSpan & {
  kind: "kpi";
  title: string;
  items: readonly HomeMetric[];
};

export type PakAiRankedSpec = WithSpan & {
  kind: "ranked";
  title: string;
  description: string;
  items: readonly HomeChartPoint[];
  valueSuffix?: string;
};

export type PakAiActionsSpec = WithSpan & {
  kind: "actions";
  title: string;
  description: string;
  items: readonly HomeActionItem[];
  actionLabel: string;
};

export type PakAiPromoSpec = WithSpan & {
  kind: "promo";
  title: string;
  description: string;
  actionLabel: string;
};

export type PakAiWidgetSpec =
  | PakAiInsightLineSpec
  | PakAiInsightBarsSpec
  | PakAiKpiSpec
  | PakAiRankedSpec
  | PakAiActionsSpec
  | PakAiPromoSpec;

export type PakAiPreset = {
  id: PakAiPresetId;
  label: string;
  widgets: readonly PakAiWidgetSpec[];
};

export const PAK_AI_PRESETS: Record<PakAiPresetId, PakAiPreset> = {
  performance: {
    id: "performance",
    label: "My this month performance",
    widgets: [
      {
        kind: "kpi",
        span: "1",
        title: "This month at a glance",
        items: HOME_PERFORMANCE_KPIS,
      },
      {
        kind: "insight-line",
        span: "1",
        title: "Leads are ahead of last month",
        description:
          "Month-to-date leads are up versus the same weeks last month.",
        caption: "Leads by week, this month vs prior month. Sample.",
        points: HOME_MONTH_LEADS_TREND,
      },
      {
        kind: "insight-bars",
        span: "1",
        title: "Alex Chen leads the team on new leads",
        description: "18 leads this sample week, ahead of Sam Rivera at 14.",
        caption: "Leads by sales member, count. Sample.",
        points: HOME_LEADS_BY_SALES,
      },
      {
        kind: "actions",
        span: "2",
        title: "Suggested next steps",
        description: "Priority follow-ups from your open pipeline.",
        items: HOME_PERFORMANCE_ACTIONS,
        actionLabel: "Open",
      },
      {
        kind: "promo",
        span: "1",
        title: "Let PakAI draft your weekly digest",
        description:
          "Auto-summarize quotes, stalled requests, and win rate for your team standup.",
        actionLabel: "Try digest",
      },
    ],
  },
  leads: {
    id: "leads",
    label: "Review new leads",
    widgets: [
      {
        kind: "insight-line",
        span: "1",
        title: "New leads are up compared to last week",
        description: "21% lift from 38 to 46 leads in the last 7 days.",
        caption: "New leads by day, this week vs last week. Sample.",
        points: HOME_LEADS_TREND,
      },
      {
        kind: "ranked",
        span: "1",
        title: "Leads by sales",
        description: "Alex Chen leads this sample with 18 leads.",
        items: HOME_LEADS_BY_SALES,
      },
      {
        kind: "kpi",
        span: "1",
        title: "Lead pulse",
        items: HOME_PRODUCT_KPIS,
      },
      {
        kind: "actions",
        span: "2",
        title: "Leads to review",
        description: "Newest inbound requests waiting on a first response.",
        items: HOME_LEAD_REVIEW_ACTIONS,
        actionLabel: "Review",
      },
      {
        kind: "promo",
        span: "1",
        title: "Route leads to the right owner",
        description:
          "Match inbound RFQs to sales capacity and product expertise automatically.",
        actionLabel: "Preview routing",
      },
    ],
  },
  products: {
    id: "products",
    label: "Popular products",
    widgets: [
      {
        kind: "insight-line",
        span: "1",
        title: "Mailer boxes are driving the most product requests",
        description:
          "Requests for mailer boxes lead the sample trend vs last week.",
        caption: "Product requests by week, this period vs prior. Sample.",
        points: HOME_PRODUCT_REQUESTS_TREND,
      },
      {
        kind: "ranked",
        span: "1",
        title: "Top products",
        description: "Mailer boxes lead with 22 sample requests.",
        items: HOME_POPULAR_PRODUCTS,
      },
      {
        kind: "kpi",
        span: "1",
        title: "Traffic & conversion",
        items: HOME_PRODUCT_KPIS,
      },
      {
        kind: "promo",
        span: "2",
        title: "Spotlight mailer boxes this week",
        description:
          "Pin a home promo and sample pack CTA for the product driving the most RFQs.",
        actionLabel: "Create spotlight",
      },
      {
        kind: "ranked",
        span: "1",
        title: "Rising styles",
        description: "Folding cartons and rigid boxes are climbing.",
        items: HOME_POPULAR_PRODUCTS.slice(1),
      },
    ],
  },
};

/** Soft-match free text to a pill preset; default performance. */
export function resolvePakAiPreset(input: string): PakAiPresetId {
  const q = input.trim().toLowerCase();
  if (!q) return "performance";
  if (
    q.includes("lead") ||
    q.includes("pipeline") ||
    q.includes("review new")
  ) {
    return "leads";
  }
  if (
    q.includes("product") ||
    q.includes("mailer") ||
    q.includes("popular product")
  ) {
    return "products";
  }
  if (
    q.includes("performance") ||
    q.includes("this month") ||
    q.includes("quota") ||
    q.includes("win rate")
  ) {
    return "performance";
  }
  return "performance";
}
