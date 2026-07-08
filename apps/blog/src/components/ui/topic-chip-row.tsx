import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

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

/** White rounded-full pill with hairline border + soft shadow (POC topic chip). */
const CHIP_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:border-foreground/30";

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
        <Link key={topic.key ?? topic.href} href={topic.href} className={CHIP_CLASS}>
          {topic.title}
        </Link>
      ))}
      <Link href={exploreHref} className={CHIP_CLASS}>
        <Compass className="size-4 shrink-0" aria-hidden />
        {exploreLabel}
      </Link>
    </div>
  );
}
