import type {
    PostPopularRowBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostList} from '@/components/modules/post-list';
import {
    POST_ROW_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {toPostCardDataList} from '@/lib/post-card-data';

/**
 * `postPopularRow` page-builder section — auto-populated row of popular posts
 * this month (with fallback to latest when the month window is sparse).
 */
export function PostPopularRow({
    heading,
    posts,
    postsCount,
    showTopBorder,
    showBottomBorder,
}: BlockProps<PostPopularRowBlock>) {
    if (!posts?.length) return null;

    const count = postsCount ?? 3;
    const cards = toPostCardDataList(posts).slice(0, count);
    const sectionHeading = heading?.trim() || 'Popular this month';
    const sectionId = 'popular-this-month-heading';
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        POST_ROW_DIELINE_BORDER_DEFAULTS,
    );

    return (
        <PageDielineFullBleedSection
            aria-labelledby={sectionId}
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-10"
        >
            <div className="mb-6">
                <h2
                    id={sectionId}
                    className="text-2xl font-semibold tracking-tight"
                >
                    {sectionHeading}
                </h2>
            </div>
            <PostList posts={cards} columns={3} />
        </PageDielineFullBleedSection>
    );
}
