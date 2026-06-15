import type { PostFeaturedRowBlock, BlockProps } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import { PostCard } from "@/components/modules/post-card";
import { PostList } from "@/components/modules/post-list";
import { toPostCardData, toPostCardDataList } from "@/lib/post-card-data";

/**
 * `postFeaturedRow` page-builder block — a featured post plus a column of the
 * latest posts. Falls back to the newest post when no post is pinned.
 */
export function PostFeaturedRow({
  featured,
  latest,
  latestPostsCount,
}: BlockProps<PostFeaturedRowBlock>) {
  const resolvedFeatured = featured ?? latest[0] ?? null;
  // When no post is pinned, the newest post becomes the hero — drop it from
  // the "Latest" column so it is not shown twice.
  const latestPool = featured ? latest : latest.slice(1);
  const count = latestPostsCount ?? 4;

  const featuredCard = resolvedFeatured
    ? toPostCardData(resolvedFeatured, { imageWidth: 900 })
    : null;
  const latestCards = toPostCardDataList(latestPool).slice(0, count);

  return (
    <PageDielineFullBleedSection
      aria-labelledby="post-featured-row-heading"
      borderBottom
      innerClassName="py-10"
    >
      <h2 id="post-featured-row-heading" className="sr-only">
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
