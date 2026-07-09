import type {
    PostFeaturedRowBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostCard} from '@/components/modules/post-card';
import {PostList} from '@/components/modules/post-list';
import {
    POST_ROW_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {toPostCardData, toPostCardDataList} from '@/lib/post-card-data';

/**
 * `postFeaturedRow` page-builder section — a featured post plus a column of the
 * latest posts. Falls back to the newest post when no post is pinned.
 */
export function PostFeaturedRow({
    featured,
    latest,
    latestPostsCount,
    showTopBorder,
    showBottomBorder,
}: BlockProps<PostFeaturedRowBlock>) {
    const resolvedFeatured = featured ?? latest[0] ?? null;
    // When no post is pinned, the newest post becomes the hero — drop it from
    // the "Latest" column so it is not shown twice.
    const latestPool = featured ? latest : latest.slice(1);
    const count = latestPostsCount ?? 3;

    const featuredCard = resolvedFeatured
        ? toPostCardData(resolvedFeatured, {imageWidth: 900})
        : null;
    const latestCards = toPostCardDataList(latestPool).slice(0, count);
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        POST_ROW_DIELINE_BORDER_DEFAULTS,
    );

    return (
        <PageDielineFullBleedSection
            aria-labelledby="post-featured-row-heading"
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-8 lg:py-10"
        >
            <div className="flex flex-col gap-12 lg:gap-8">
                <h2
                    id="post-featured-row-heading"
                    className="text-2xl font-semibold leading-tight tracking-tight "
                >
                    Featured Posts
                </h2>
                <div className="flex flex-col gap-16 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
                    <div>
                        {featuredCard ? (
                            <PostCard
                                post={featuredCard}
                                variant="featuredLead"
                            />
                        ) : (
                            <p className="text-muted-foreground">
                                No featured post yet. Pin one in Studio with
                                &quot;Feature on blog home&quot;.
                            </p>
                        )}
                    </div>
                    <div className="border-t border-dashed border-border pt-8 lg:pt-4">
                        <PostList
                            posts={latestCards}
                            variant="featuredListItem"
                            emptyMessage="No published posts yet."
                        />
                    </div>
                </div>
            </div>
        </PageDielineFullBleedSection>
    );
}
