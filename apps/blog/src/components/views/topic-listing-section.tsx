import type { ReactNode } from "react";
import { TopicFilterBar } from "@/components/modules/topic-filter-bar";
import { TopicLandingSection } from "@/components/views/topic-landing-layout";

type TopicListingSectionProps = {
  children: ReactNode;
  pagination: ReactNode;
};

/** Figma listing band — filter bar, post grid, pagination. */
export function TopicListingSection({
  children,
  pagination,
}: TopicListingSectionProps) {
  return (
    <TopicLandingSection>
      <TopicFilterBar />
      <div className="mt-12 flex flex-col gap-10">{children}</div>
      {pagination}
    </TopicLandingSection>
  );
}
