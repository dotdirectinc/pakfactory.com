import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
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

/** Pill "View all" button — POC category-row header style (200ms hover tint). Display is set per Link. */
const VIEW_ALL_PILL_CLASS =
    'shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary hover:bg-[var(--opacity-primary-10)] hover:text-primary';

/**
 * `postCategoryRow` page-builder section — editorial category row per the
 * approved POC: heading + one-line category intro + pill "View all" button
 * (top-right on desktop, bottom-center on mobile) + a row of the newest posts
 * in the category.
 */
export function PostCategoryRow({
    categorySlug,
    categoryTitle,
    categoryDescription,
    posts,
    postsCount,
    showTopBorder,
    showBottomBorder,
}: BlockProps<PostCategoryRowBlock>) {
    if (!categorySlug || posts.length === 0) return null;

    const count = postsCount ?? 3;
    const cards = toPostCardDataList(posts, {categorySlug}).slice(0, count);
    const sectionId = `category-${categorySlug}`;
    const href = categoryHref(categorySlug);
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        POST_ROW_DIELINE_BORDER_DEFAULTS,
    );

    const viewAll = (
        <>
            View all
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </>
    );

    return (
        <PageDielineFullBleedSection
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-12"
        >
            <div
                aria-labelledby={sectionId}
                className="flex flex-col gap-8 border-none"
            >
                <div className="flex items-end justify-between gap-6">
                    <div className="flex w-full flex-col gap-2 lg:max-w-[640px]">
                        <h2
                            id={sectionId}
                            className="text-2xl font-semibold leading-tight tracking-tight text-foreground lg:text-3xl"
                        >
                            {categoryTitle ?? categorySlug}
                        </h2>
                        {categoryDescription ? (
                            <p className="text-base leading-6 text-muted-foreground">
                                {categoryDescription}
                            </p>
                        ) : null}
                    </div>
                    <Link
                        href={href}
                        className={`hidden lg:inline-flex ${VIEW_ALL_PILL_CLASS}`}
                    >
                        {viewAll}
                    </Link>
                </div>
                <PostList
                    posts={cards}
                    emptyMessage="No posts in this category yet."
                />
                {/* Mobile: full-width View all at the bottom of the section (POC + AC #3) */}
                <Link
                    href={href}
                    className={`flex w-full justify-center lg:hidden ${VIEW_ALL_PILL_CLASS}`}
                >
                    {viewAll}
                </Link>
            </div>
        </PageDielineFullBleedSection>
    );
}
