import { HomeWorkspace } from "@/components/home/home-workspace";
import { MetricStrip } from "@/components/home/metric-strip";

export function HomeView({ displayName }: { displayName: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl flex-col">
      <div className="shrink-0 pt-2 pb-8">
        <MetricStrip />
      </div>
      <HomeWorkspace displayName={displayName} />
    </div>
  );
}
