import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";
import { TopicChip, TopicExploreChip } from "@/components/ui/topic-chip";

export type TopicChipItem = { key?: string; title: string; href: string };

type TopicChipRowProps = {
  /** Leading label, e.g. "Recommended topics:". */
  label: string;
  topics: TopicChipItem[];
  /** Trailing "explore" chip target (e.g. the topics index). */
  exploreHref: string;
  exploreLabel?: string;
  className?: string;
};

/**
 * Controlled, presentational topic-chip row (ADR-013 shared core): a label,
 * topic chips, and a trailing "explore" chip. Links + copy are supplied by the
 * caller — no data fetching, no feature-specific hrefs.
 */
export function TopicChipRow({
  label,
  topics,
  exploreHref,
  exploreLabel = "Explore all topics",
  className,
}: TopicChipRowProps) {
  const visible = topics.filter((topic) => topic.href && topic.title);

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="text-base font-medium text-muted-foreground">{label}</span>
      {visible.map((topic) => (
        <TopicChip key={topic.key ?? topic.href} href={topic.href}>
          {topic.title}
        </TopicChip>
      ))}
      <TopicExploreChip href={exploreHref} label={exploreLabel} />
    </div>
  );
}
