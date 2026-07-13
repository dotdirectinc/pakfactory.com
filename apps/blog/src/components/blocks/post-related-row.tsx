import Link from 'next/link';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostList} from '@/components/modules/post-list';
import type {HomePostCard} from '@/lib/blog-home';
import {categoryHref} from '@/lib/blog-post-url';
import {toPostCardDataList} from '@/lib/post-card-data';

const DEFAULT_HEADING = 'Related articles';

type PostRelatedRowProps = {
    posts: HomePostCard[];
    categorySlug?: string;
    categoryTitle?: string;
    heading?: string;
    postsCount?: number;
    showTopBorder?: boolean;
    showBottomBorder?: boolean;
};

/**
 * Post detail related-articles band — same layout as `PostCategoryRow`
 * (heading, optional "View all", post grid). Posts resolve from the post
 * document's `relatedPosts` field or same-category fallback in GROQ.
 */
export function PostRelatedRow({
    posts,
    categorySlug,
    heading,
    postsCount,
    showTopBorder,
    showBottomBorder,
}: PostRelatedRowProps) {
    if (posts.length === 0) return null;

    const count = postsCount ?? 3;
    const cards = toPostCardDataList(posts, {categorySlug}).slice(0, count);
    const sectionHeading = heading?.trim() || DEFAULT_HEADING;
    const sectionId = 'post-related-row-heading';

    return (
        <PageDielineFullBleedSection
            innerClassName="py-16"
            borderTop={showTopBorder}
            borderBottom={showBottomBorder}
        >
            <div aria-labelledby={sectionId} className="border-none">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <h2
                        id={sectionId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        {sectionHeading}
                    </h2>
                    {categorySlug ? (
                        <Link
                            href={categoryHref(categorySlug)}
                            className="shrink-0 text-sm font-medium text-primary hover:underline"
                        >
                            View all →
                        </Link>
                    ) : null}
                </div>
                <PostList
                    posts={cards}
                    emptyMessage="No related articles yet."
                />
            </div>
        </PageDielineFullBleedSection>
    );
}
