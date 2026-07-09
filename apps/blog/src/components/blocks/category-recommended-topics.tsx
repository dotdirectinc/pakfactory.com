import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { TopicChipRow } from "@/components/ui/topic-chip-row";
import type { CategoryTopic } from "@/lib/blog-category-archive";
import { tagHref } from "@/lib/blog-post-url";

type CategoryRecommendedTopicsProps = {
  topics: CategoryTopic[];
};

/**
 * Category recommended-topics row (PROD-1951, Figma `top-nav` 2460:33962).
 * Chips are the tags of the category's freshest post (most-recently-modified),
 * each linking to its topic archive, plus a trailing "Explore all topics" chip.
 * Renders nothing when that post has no tags.
 */
export function CategoryRecommendedTopics({
  topics,
}: CategoryRecommendedTopicsProps) {
  const items = topics
    .filter((topic) => topic.slug && topic.title)
    .map((topic) => ({
      key: topic._id ?? topic.slug,
      title: topic.title,
      href: tagHref(topic.slug),
    }));

  if (items.length === 0) return null;

  return (
    <PageDielineSection innerClassName="py-8 sm:py-10">
      <TopicChipRow
        label="Recommended topics:"
        topics={items}
        exploreHref="/topics"
      />
    </PageDielineSection>
  );
}
