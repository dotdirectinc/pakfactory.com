import Link from "next/link";
import { Compass } from "lucide-react";
import type { TagFacet } from "@/lib/blog-tag-archive";
import { tagHref } from "@/lib/blog-post-url";

const MAX_RELATED_TOPICS = 8;

/**
 * POC topic chip — white rounded-full pill with hairline border + soft shadow.
 * Mirrors the POC BlogTopicHeader chip (Figma topic detail header).
 */
const TOPIC_CHIP_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:border-foreground/30";

type TopicRelatedPillsProps = {
  topics: TagFacet[];
};

/** Co-occurring topic pills + link to the topics index (Figma topic detail header). */
export function TopicRelatedPills({ topics }: TopicRelatedPillsProps) {
  const visible = topics.filter((topic) => topic.slug?.trim()).slice(0, MAX_RELATED_TOPICS);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-base font-medium text-muted-foreground">
        Related topics:
      </span>
      {visible.map((topic) => (
        <Link
          key={topic._id ?? topic.slug}
          href={tagHref(topic.slug)}
          className={TOPIC_CHIP_CLASS}
        >
          {topic.title}
        </Link>
      ))}
      <Link href="/topics" className={TOPIC_CHIP_CLASS}>
        <Compass className="size-4 shrink-0" aria-hidden />
        Explore all topics
      </Link>
    </div>
  );
}
