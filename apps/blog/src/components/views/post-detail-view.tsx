import {Breadcrumb} from '@/components/layout/breadcrumb';
import {PostReadTracker} from '@/components/modules/analytics/post-read-tracker';
import {CtaNewsletter} from '@/components/blocks/cta-newsletter';
import {PostArticleColumn} from '@/components/post/post-article-column';
import {PostDetailHeader} from '@/components/post/post-detail-header';
import {PostDetailLayout} from '@/components/post/post-detail-layout';
import {PostDetailSidebar} from '@/components/post/post-detail-sidebar';
import {PostRelatedRow} from '@/components/blocks/post-related-row';
import type {BlogPostDetail} from '@/lib/blog-post';
import {postCanonicalUrl} from '@/lib/blog-post';
import {categoryHref} from '@/lib/blog-post-url';
import {buildPostToc} from '@/lib/post-toc';
import {resolveImageAlt} from '@/lib/sanity-image';

type PostDetailViewProps = {
    post: BlogPostDetail;
};

export function PostDetailView({post}: PostDetailViewProps) {
    const {entries: toc, headingIdByKey} = buildPostToc(post.body);
    const canonicalUrl = postCanonicalUrl(post);

    const breadcrumbItems = [
        {label: 'Blog', href: '/'},
        ...(post.categorySlug && post.categoryTitle
            ? [
                  {
                      label: post.categoryTitle,
                      href: categoryHref(post.categorySlug),
                  },
              ]
            : []),
        {label: post.title},
    ];

    return (
        <PostDetailLayout
            breadcrumb={
                <>
                    <PostReadTracker
                        slug={post.slug}
                        category={post.categoryTitle}
                        tags={(post.tags ?? []).map((tag) => tag.title)}
                        author={post.author?.name}
                        readingTimeMinutes={post.readingTimeMinutes ?? undefined}
                    />
                    <Breadcrumb items={breadcrumbItems} />
                </>
            }
            header={
                <PostDetailHeader
                    title={post.title}
                    subtitle={post.excerpt}
                    categoryTitle={post.categoryTitle}
                    categorySlug={post.categorySlug}
                    publishedAt={post.publishedAt}
                    lastModified={post.lastModified}
                    readingTimeMinutes={post.readingTimeMinutes}
                    mainImage={post.mainImage}
                    mainImageAlt={resolveImageAlt(post.mainImage, post.title)}
                />
            }
            sidebar={
                <PostDetailSidebar
                    author={post.author}
                    toc={toc}
                    shareUrl={canonicalUrl}
                    shareTitle={post.title}
                />
            }
            article={
                <PostArticleColumn
                    post={post}
                    headingIdByKey={headingIdByKey}
                    shareUrl={canonicalUrl}
                    shareTitle={post.title}
                />
            }
            footer={
                <>
                    <PostRelatedRow
                        posts={post.relatedPosts ?? []}
                        categorySlug={post.categorySlug}
                        categoryTitle={post.categoryTitle}
                        showTopBorder={false}
                        showBottomBorder={false}
                    />
                    <CtaNewsletter
                        showTopBorder={false}
                        showBottomBorder={false}
                    />
                </>
            }
        />
    );
}
