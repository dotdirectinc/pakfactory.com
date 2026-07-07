import type { ReactNode } from "react";
import {
  TopicFilterBar,
  type CategoryOption,
} from "@/components/modules/topic-filter-bar";
import { TopicLandingSection } from "@/components/views/topic-landing-layout";

type TopicListingSectionProps = {
  children: ReactNode;
  pagination: ReactNode;
  categoryOptions: CategoryOption[];
};

/** Figma listing band — filter bar, post grid, pagination. */
export function TopicListingSection({
  children,
  pagination,
  categoryOptions,
}: TopicListingSectionProps) {
  return (
    <TopicLandingSection>
      <TopicFilterBar categoryOptions={categoryOptions} />
      <div className="mt-12 flex flex-col gap-10">{children}</div>
      {pagination}
    </TopicLandingSection>
  );
}
