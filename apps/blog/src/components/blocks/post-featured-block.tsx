import type {
    PostFeaturedRowBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostFeaturedRow} from '@/components/modules/post-featured-row';
import {
    POST_ROW_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {toPostCardData, toPostCardDataList} from '@/lib/post-card-data';

const FEATURED_RIGHT_RAIL_LIMIT = 3;

/**
 * `postFeaturedRow` page-builder block — a featured post plus a column of the
 * latest posts. Falls back to the newest post when no post is pinned.
 */
export function PostFeaturedBlock({
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
    const count = Math.min(
        latestPostsCount ?? FEATURED_RIGHT_RAIL_LIMIT,
        FEATURED_RIGHT_RAIL_LIMIT,
    );

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
            aria-labelledby="post-featured-block-heading"
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-8 lg:py-16"
        >
            <PostFeaturedRow
                heading="Featured Posts"
                headingId="post-featured-block-heading"
                lead={featuredCard}
                secondary={latestCards}
                emptyLeadMessage='No featured post yet. Pin one in Studio with "Feature on blog home".'
            />
        </PageDielineFullBleedSection>
    );
}
