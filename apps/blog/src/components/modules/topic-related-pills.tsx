import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import type { TagFacet } from "@/lib/blog-tag-archive";
import { tagHref } from "@/lib/blog-post-url";

const MAX_RELATED_TOPICS = 8;

type TopicRelatedPillsProps = {
  topics: TagFacet[];
};

/** Co-occurring topic pills + link to the topics index (Figma topic detail header). */
export function TopicRelatedPills({ topics }: TopicRelatedPillsProps) {
  const visible = topics.filter((topic) => topic.slug?.trim()).slice(0, MAX_RELATED_TOPICS);

  if (visible.length === 0) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <span className="text-base font-medium text-muted-foreground">
        Related topics:
      </span>
      {visible.map((topic) => (
        <Badge key={topic._id ?? topic.slug} variant="outline" asChild>
          <Link href={tagHref(topic.slug)}>{topic.title}</Link>
        </Badge>
      ))}
      <Badge variant="outline" asChild>
        <Link href="/topics" className="inline-flex items-center gap-2">
          <LayoutGrid className="size-4 shrink-0" aria-hidden />
          Explore all topics
        </Link>
      </Badge>
    </div>
  );
}
