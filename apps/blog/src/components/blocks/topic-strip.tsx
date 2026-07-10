import type { TopicStripBlock, BlockProps } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import { TopicChip, TopicExploreChip } from "@/components/ui/topic-chip";
import {
  POST_ROW_DIELINE_BORDER_DEFAULTS,
  resolveDielineBorders,
} from "@/lib/dieline-borders";
import { tagHref } from "@/lib/blog-post-url";

/**
 * `topicStrip` page-builder section — curated topic chips with an explore-first
 * pill (404/search recovery parity). Generic over any blogTag group.
 */
export function TopicStrip({
  heading,
  topics,
  showTopBorder,
  showBottomBorder,
}: BlockProps<TopicStripBlock>) {
  if (!topics || topics.length === 0) return null;

  const label = heading ?? "Browse by topic";
  const headingId = "topic-strip-heading";
  const { borderTop, borderBottom } = resolveDielineBorders(
    showTopBorder,
    showBottomBorder,
    POST_ROW_DIELINE_BORDER_DEFAULTS,
  );

  return (
    <PageDielineFullBleedSection
      aria-labelledby={headingId}
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-8 lg:py-28"
    >
      <h2
        id={headingId}
        className="text-2xl font-semibold leading-tight tracking-tight"
      >
        {label}
      </h2>
      <nav className="mt-6" aria-label={label}>
        <ul className="flex flex-wrap gap-3">
          <li>
            <TopicExploreChip href="/topics" accent />
          </li>
          {topics.map((topic) => (
            <li key={topic._id ?? topic.slug}>
              <TopicChip href={tagHref(topic.slug)}>{topic.title}</TopicChip>
            </li>
          ))}
        </ul>
      </nav>
    </PageDielineFullBleedSection>
  );
}
