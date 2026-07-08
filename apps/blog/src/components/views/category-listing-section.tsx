import type { ReactNode } from "react";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";

type CategoryListingSectionProps = {
  children: ReactNode;
  pagination: ReactNode;
};

/**
 * Figma listing band — post grid + pagination. No filter bar: the category page
 * is a top-of-funnel discovery view (PROD-1951 AC#8; the Figma filter/sort frames
 * are hidden).
 */
export function CategoryListingSection({
  children,
  pagination,
}: CategoryListingSectionProps) {
  return (
    <CategoryLandingSection>
      <div className="flex flex-col gap-10">{children}</div>
      {pagination}
    </CategoryLandingSection>
  );
}
