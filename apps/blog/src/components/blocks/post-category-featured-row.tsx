import { PostFeaturedRotator } from "@/components/modules/post-featured-rotator";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardData } from "@/lib/post-card-data";

const DEFAULT_HEADING = "Featured Posts";
const FEATURED_SLIDE_LIMIT = 4;

type PostCategoryFeaturedRowProps = {
  heading?: string;
  posts?: HomePostCard[];
  categorySlug: string;
};

/**
 * Category landing featured band — same rotating hero UI as the home page
 * (modules/post-featured-rotator), fed by the category's own data source:
 * posts pinned via `featuredInCategory` (unchanged). UI unified 2026-07-14;
 * data logic deliberately left per-surface.
 */
export function PostCategoryFeaturedRow({
  heading,
  posts,
  categorySlug,
}: PostCategoryFeaturedRowProps) {
  const all = posts ?? [];
  if (all.length === 0) return null;

  const slides = all
    .slice(0, FEATURED_SLIDE_LIMIT)
    .map((post) => toPostCardData(post, { categorySlug }));
  const sectionHeading = heading?.trim() || DEFAULT_HEADING;

  return (
    <CategoryLandingSection innerClassName="py-12">
      <PostFeaturedRotator heading={sectionHeading} slides={slides} />
    </CategoryLandingSection>
  );
}
