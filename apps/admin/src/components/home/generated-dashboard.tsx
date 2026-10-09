"use client";

import { toast } from "sonner";
import { Button } from "@pakfactory/ui/components/button";
import { ActionQueue } from "@/components/home/ui/action-queue";
import { InsightCard } from "@/components/home/ui/insight-card";
import {
  ColumnChart,
  CompareLineChart,
} from "@/components/home/ui/insight-charts";
import { KpiMosaic } from "@/components/home/ui/kpi-mosaic";
import {
  MOSAIC_GRID_CLASS,
  mosaicSpanClass,
} from "@/components/home/ui/mosaic-span";
import { PromoTile } from "@/components/home/ui/promo-tile";
import { RankedList } from "@/components/home/ui/ranked-list";
import { ADMIN_HOME_COPY } from "@/lib/copy/home";
import {
  PAK_AI_PRESETS,
  type PakAiPresetId,
  type PakAiWidgetSpec,
} from "@/lib/home/pak-ai-presets";

function showComingSoon() {
  toast.message(ADMIN_HOME_COPY.comingSoon);
}

function WidgetTile({ spec }: { spec: PakAiWidgetSpec }) {
  switch (spec.kind) {
    case "kpi":
      return <KpiMosaic title={spec.title} items={spec.items} />;
    case "ranked":
      return (
        <RankedList
          title={spec.title}
          description={spec.description}
          items={spec.items}
          valueSuffix={spec.valueSuffix}
        />
      );
    case "actions":
      return (
        <ActionQueue
          title={spec.title}
          description={spec.description}
          items={spec.items}
          actionLabel={spec.actionLabel}
          onAction={showComingSoon}
        />
      );
    case "promo":
      return (
        <PromoTile
          title={spec.title}
          description={spec.description}
          actionLabel={spec.actionLabel}
          onAction={showComingSoon}
        />
      );
    case "insight-line":
      return (
        <InsightCard title={spec.title} description={spec.description}>
          <CompareLineChart
            caption={spec.caption}
            points={spec.points}
            reportLabel={ADMIN_HOME_COPY.viewReport}
            onReportClick={showComingSoon}
          />
        </InsightCard>
      );
    case "insight-bars":
      return (
        <InsightCard title={spec.title} description={spec.description}>
          <ColumnChart
            caption={spec.caption}
            points={spec.points}
            reportLabel={ADMIN_HOME_COPY.viewReport}
            onReportClick={showComingSoon}
          />
        </InsightCard>
      );
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

export type GeneratedDashboardProps = {
  presetId: PakAiPresetId;
  onReset: () => void;
};

export function GeneratedDashboard({
  presetId,
  onReset,
}: GeneratedDashboardProps) {
  const preset = PAK_AI_PRESETS[presetId];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {ADMIN_HOME_COPY.generatedForPrefix}{" "}
          <span className="font-medium text-foreground">{preset.label}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="rounded-full"
          onClick={onReset}
        >
          {ADMIN_HOME_COPY.showHomeInsights}
        </Button>
      </div>
      <div className={MOSAIC_GRID_CLASS}>
        {preset.widgets.map((spec, index) => (
          <div
            key={`${preset.id}-${spec.kind}-${index}`}
            className={`${mosaicSpanClass(spec.span)} min-h-0 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <WidgetTile spec={spec} />
          </div>
        ))}
      </div>
    </div>
  );
}
