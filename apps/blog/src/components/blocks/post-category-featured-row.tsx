import { PostFeaturedRow } from "@/components/modules/post-featured-row";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardData, toPostCardDataList } from "@/lib/post-card-data";

const DEFAULT_HEADING = "Featured Posts";
const FEATURED_RIGHT_RAIL_LIMIT = 3;

type PostCategoryFeaturedRowProps = {
  heading?: string;
  posts?: HomePostCard[];
  categorySlug: string;
};

/**
 * Category landing featured band — composes the shared lead + right-rail split.
 */
export function PostCategoryFeaturedRow({
  heading,
  posts,
  categorySlug,
}: PostCategoryFeaturedRowProps) {
  const all = posts ?? [];
  const leadPost = all[0];
  if (!leadPost) return null;

  const lead = toPostCardData(leadPost, { categorySlug, imageWidth: 1200 });
  const secondary = toPostCardDataList(
    all.slice(1, FEATURED_RIGHT_RAIL_LIMIT + 1),
    { categorySlug },
  );
  const sectionHeading = heading?.trim() || DEFAULT_HEADING;

  return (
    <CategoryLandingSection innerClassName="py-12">
      <PostFeaturedRow
        heading={sectionHeading}
        lead={lead}
        secondary={secondary}
      />
    </CategoryLandingSection>
  );
}
