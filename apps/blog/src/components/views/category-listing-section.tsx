import type { ReactNode } from "react";
import { CategoryFilterBar } from "@/components/modules/category-filter-bar";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";

type CategoryListingSectionProps = {
  children: ReactNode;
  pagination: ReactNode;
};

/** Figma listing band — filter bar, post grid, pagination. */
export function CategoryListingSection({
  children,
  pagination,
}: CategoryListingSectionProps) {
  return (
    <CategoryLandingSection>
      <CategoryFilterBar />
      <div className="mt-12 flex flex-col gap-10">{children}</div>
      {pagination}
    </CategoryLandingSection>
  );
}
