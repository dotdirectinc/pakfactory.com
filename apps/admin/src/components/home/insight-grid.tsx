"use client";

import { toast } from "sonner";
import { InsightCard } from "@/components/home/ui/insight-card";
import {
  ColumnChart,
  CompareLineChart,
} from "@/components/home/ui/insight-charts";
import { ADMIN_HOME_COPY } from "@/lib/copy/home";
import {
  HOME_LEADS_BY_SALES,
  HOME_LEADS_TREND,
  HOME_PRODUCT_REQUESTS_TREND,
} from "@/lib/home/sample-metrics";

function showComingSoon() {
  toast.message(ADMIN_HOME_COPY.comingSoon);
}

export function InsightGrid() {
  return (
    <div className="grid w-full gap-4 lg:grid-cols-3">
      <InsightCard
        title="New leads are up compared to last week"
        description={
          <>
            <span className="font-semibold text-foreground">21%</span> lift from{" "}
            <span className="font-semibold text-foreground">38</span> to{" "}
            <span className="font-semibold text-foreground">46</span> leads in
            the last 7 days.
          </>
        }
      >
        <CompareLineChart
          caption="New leads by day, this week vs last week. Sample."
          points={HOME_LEADS_TREND}
          reportLabel={ADMIN_HOME_COPY.viewReport}
          onReportClick={showComingSoon}
        />
      </InsightCard>

      <InsightCard
        title="Alex Chen leads the team on new leads"
        description={
          <>
            <span className="font-semibold text-foreground">18</span> leads this
            sample week, ahead of Sam Rivera at{" "}
            <span className="font-semibold text-foreground">14</span>.
          </>
        }
      >
        <ColumnChart
          caption="Leads by sales member, count. Sample, last 7 days."
          points={HOME_LEADS_BY_SALES}
          reportLabel={ADMIN_HOME_COPY.viewReport}
          onReportClick={showComingSoon}
        />
      </InsightCard>

      <InsightCard
        title="Mailer boxes are driving the most product requests"
        description={
          <>
            Requests for{" "}
            <span className="font-semibold text-foreground">mailer boxes</span>{" "}
            lead the sample trend vs last week.
          </>
        }
      >
        <CompareLineChart
          caption="Product requests by week, this period vs prior. Sample."
          points={HOME_PRODUCT_REQUESTS_TREND}
          reportLabel={ADMIN_HOME_COPY.viewReport}
          onReportClick={showComingSoon}
        />
      </InsightCard>
    </div>
  );
}
