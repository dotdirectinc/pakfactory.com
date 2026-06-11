import type { HomePostCard } from "@/lib/blog-home";
import { PageDielineFullBleedSection } from "@/components/common/page-dieline-section";
import { PostCard } from "@/components/post/post-card";
import { PostList } from "@/components/post/post-list";
import { toPostCardData, toPostCardDataList } from "@/lib/post-card-data";

type PostFeaturedSectionProps = {
  featured: HomePostCard | null;
  latest: HomePostCard[];
  borderTop?: boolean;
  borderBottom?: boolean;
};

export function PostFeaturedSection({
  featured,
  latest,
  borderTop,
  borderBottom,
}: PostFeaturedSectionProps) {
  const featuredCard = featured
    ? toPostCardData(featured, { imageWidth: 900 })
    : null;
  const latestCards = toPostCardDataList(latest).slice(0, 3);

  return (
    <PageDielineFullBleedSection
      aria-labelledby="post-featured-section-heading"
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-10"
    >
      <h2 id="post-featured-section-heading" className="sr-only">
        Featured and latest articles
      </h2>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-6">
        <div className="flex flex-col gap-8">
          <h3 className="text-3xl font-semibold leading-9 tracking-tight">
            Featured
          </h3>
          {featuredCard ? (
            <PostCard post={featuredCard} variant="featured" />
          ) : (
            <p className="text-muted-foreground">
              No featured post yet. Pin one in Studio with &quot;Feature on blog
              home&quot;.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-8">
          <h3 className="text-3xl font-semibold leading-9 tracking-tight">
            Latest posts
          </h3>
          <PostList
            posts={latestCards}
            variant="horizontal"
            emptyMessage="No published posts yet."
          />
        </div>
      </div>
    </PageDielineFullBleedSection>
  );
}
