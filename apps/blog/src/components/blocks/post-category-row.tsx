import Link from 'next/link';
import type {
    PostCategoryRowBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {PostList} from '@/components/modules/post-list';
import {categoryHref} from '@/lib/blog-post-url';
import {
    POST_ROW_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {toPostCardDataList} from '@/lib/post-card-data';

/**
 * `postCategoryRow` page-builder section — one row of the newest posts in a
 * single category, with a "View all" link to its archive.
 */
export function PostCategoryRow({
    categorySlug,
    categoryTitle,
    posts,
    postsCount,
    showTopBorder,
    showBottomBorder,
}: BlockProps<PostCategoryRowBlock>) {
    if (!categorySlug || posts.length === 0) return null;

    const count = postsCount ?? 3;
    const cards = toPostCardDataList(posts, {categorySlug}).slice(0, count);
    const sectionId = `category-${categorySlug}`;
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        POST_ROW_DIELINE_BORDER_DEFAULTS,
    );

    return (
        <PageDielineFullBleedSection
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-10"
        >
            <div aria-labelledby={sectionId} className="border-none">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <h2
                        id={sectionId}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        {categoryTitle ?? categorySlug}
                    </h2>
                    <Link
                        href={categoryHref(categorySlug)}
                        className="shrink-0 text-sm font-medium text-primary hover:underline"
                    >
                        View all →
                    </Link>
                </div>
                <PostList
                    posts={cards}
                    emptyMessage="No posts in this category yet."
                />
            </div>
        </PageDielineFullBleedSection>
    );
}
