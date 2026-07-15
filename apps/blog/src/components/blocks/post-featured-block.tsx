import type {
    PostFeaturedRowBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostFeaturedRotator} from '@/components/modules/post-featured-rotator';
import {
    POST_ROW_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import type {HomePostCard} from '@/lib/blog-home';
import {toPostCardData} from '@/lib/post-card-data';

const HERO_SLIDE_COUNT = 4;

/**
 * `postFeaturedRow` page-builder block — exactly four editor-selected posts
 * rendered as the rotating home hero (lead crossfade + right-rail rows; see
 * modules/post-featured-rotator). The Studio field is optional: when empty
 * (or referenced posts are unpublished), falls back to recently published
 * posts — featured-flagged (`featuredInCategory`) first — so the page never
 * renders an empty hero.
 */
export function PostFeaturedBlock({
    slides,
    fallbackLatest,
    showTopBorder,
    showBottomBorder,
}: BlockProps<PostFeaturedRowBlock>) {
    const selected = (slides ?? []).filter(
        (post): post is HomePostCard => Boolean(post),
    );
    const pool = selected.length >= 2 ? selected : fallbackLatest;
    const slideCards = pool
        .slice(0, HERO_SLIDE_COUNT)
        .map((post) => toPostCardData(post));
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        POST_ROW_DIELINE_BORDER_DEFAULTS,
    );

    if (slideCards.length === 0) return null;

    return (
        <PageDielineFullBleedSection
            aria-labelledby="post-featured-block-heading"
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-8 lg:py-16"
        >
            <PostFeaturedRotator
                heading="Featured Posts"
                headingId="post-featured-block-heading"
                slides={slideCards}
            />
        </PageDielineFullBleedSection>
    );
}
