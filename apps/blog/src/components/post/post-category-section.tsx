import Link from 'next/link';
import {PageDielineFullBleedSection} from '@/components/common/page-dieline-section';
import {PostList} from '@/components/post/post-list';
import type {PostCardData} from '@/components/post/post-card';

type PostCategoryRow = {
    slug: string;
    title: string;
    viewAllHref: string;
    posts: PostCardData[];
};

type PostCategorySectionProps = {
    rows: PostCategoryRow[];
    className?: string;
    borderTop?: boolean;
    borderBottom?: boolean;
};

export function PostCategorySection({
    rows,
    className,
    borderTop,
    borderBottom,
}: PostCategorySectionProps) {
    if (rows.length === 0) return null;

    return (
        <PageDielineFullBleedSection
            borderTop={borderTop}
            borderBottom={borderBottom}
            sectionClassName={className}
            innerClassName="divide-y divide-dashed divide-border"
        >
            {rows.map((row) => {
                const sectionId = `category-${row.slug}`;

                return (
                    <div
                        key={row.slug}
                        aria-labelledby={sectionId}
                        className="py-10 border-none"
                    >
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <h2
                                id={sectionId}
                                className="text-xl font-semibold tracking-tight sm:text-2xl"
                            >
                                {row.title}
                            </h2>
                            <Link
                                href={row.viewAllHref}
                                className="shrink-0 text-sm font-medium text-primary hover:underline"
                            >
                                View all →
                            </Link>
                        </div>
                        <PostList
                            posts={row.posts}
                            emptyMessage="No posts in this category yet."
                        />
                    </div>
                );
            })}
        </PageDielineFullBleedSection>
    );
}
