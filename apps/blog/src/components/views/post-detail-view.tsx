import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { CtaRfq } from "@/components/sections/cta-rfq";
import { PostArticleColumn } from "@/components/post/post-article-column";
import { PostDetailHeader } from "@/components/post/post-detail-header";
import { PostDetailLayout } from "@/components/post/post-detail-layout";
import { PostDetailSidebar } from "@/components/post/post-detail-sidebar";
import { PostRelatedSection } from "@/components/post/post-related-section";
import type { BlogPostDetail } from "@/lib/blog-post";
import { postCanonicalUrl } from "@/lib/blog-post";
import { categoryHref } from "@/lib/blog-post-url";
import { buildPostToc } from "@/lib/post-toc";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostDetailViewProps = {
  post: BlogPostDetail;
};

function mainImageAlt(post: BlogPostDetail): string | undefined {
  if (
    typeof post.mainImage === "object" &&
    post.mainImage !== null &&
    "alt" in post.mainImage &&
    typeof (post.mainImage as { alt?: string }).alt === "string"
  ) {
    return (post.mainImage as { alt?: string }).alt;
  }
  return post.title;
}

export function PostDetailView({ post }: PostDetailViewProps) {
  const { entries: toc, headingIdByKey } = buildPostToc(post.body);
  const canonicalUrl = postCanonicalUrl(post);

  const breadcrumbItems = [
    { label: "Blog", href: "/" },
    ...(post.categorySlug && post.categoryTitle
      ? [{ label: post.categoryTitle, href: categoryHref(post.categorySlug) }]
      : []),
    { label: post.title },
  ];

  return (
    <PostDetailLayout
      breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      header={
        <PostDetailHeader
          title={post.title}
          categoryTitle={post.categoryTitle}
          categorySlug={post.categorySlug}
          authorName={post.author?.name}
          authorSlug={post.author?.slug}
          authorPhoto={post.author?.photo}
          publishedAt={post.publishedAt}
          lastModified={post.lastModified}
          readingTimeMinutes={post.readingTimeMinutes}
          mainImage={post.mainImage}
          mainImageAlt={mainImageAlt(post)}
        />
      }
      sidebar={
        <PostDetailSidebar
          toc={toc}
          shareUrl={canonicalUrl}
          shareTitle={post.title}
        />
      }
      article={<PostArticleColumn post={post} headingIdByKey={headingIdByKey} />}
      footer={
        <>
          <PostRelatedSection
            posts={post.relatedPosts ?? []}
            categorySlug={post.categorySlug}
          />
          <PageDielineSection innerClassName="py-16 sm:py-24">
            <CtaRfq />
          </PageDielineSection>
        </>
      }
    />
  );
}
