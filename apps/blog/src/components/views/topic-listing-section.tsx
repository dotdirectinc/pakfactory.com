import type { ReactNode } from "react";
import {
  TopicFilterBar,
  type CategoryOption,
} from "@/components/modules/topic-filter-bar";
import { TopicLandingSection } from "@/components/views/topic-landing-layout";
import type { TagListFilters } from "@/lib/blog-tag-archive";

type TopicListingSectionProps = {
  children: ReactNode;
  pagination: ReactNode;
  tagSlug: string;
  filters: TagListFilters;
  categoryOptions: CategoryOption[];
  perPage: number;
};

/** Figma listing band — filter bar, post grid, pagination. */
export function TopicListingSection({
  children,
  pagination,
  tagSlug,
  filters,
  categoryOptions,
  perPage,
}: TopicListingSectionProps) {
  return (
    <TopicLandingSection>
      <TopicFilterBar
        tagSlug={tagSlug}
        filters={filters}
        categoryOptions={categoryOptions}
        perPage={perPage}
      />
      <div className="mt-12 flex flex-col gap-10">{children}</div>
      {pagination && <div className="py-16">{pagination}</div>}
    </TopicLandingSection>
  );
}
