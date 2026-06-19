import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Pagination } from "@/components/modules/pagination";
import { PostList } from "@/components/modules/post-list";
import { CtaRfq } from "@/components/sections/cta-rfq";
import { CategoryFeaturedSection } from "@/components/views/category-featured-section";
import { CategoryHeader } from "@/components/views/category-header";
import { CategoryLandingLayout } from "@/components/views/category-landing-layout";
import { CategoryListingSection } from "@/components/views/category-listing-section";
import { pagedHeading } from "@/lib/archive-format";
import { buildCategoryArchiveJsonLd } from "@/lib/category-archive-jsonld";
import {
  categoryPageHref,
  type CategoryArchivePageData,
} from "@/lib/blog-category-archive";
import type { PostCardData } from "@/lib/post-card-data";
import { toPostCardDataList } from "@/lib/post-card-data";

function previewFeaturedCards(
  posts: CategoryArchivePageData["posts"],
  categorySlug: string,
): { hero: PostCardData | null; secondary: PostCardData[] } {
  const cards = toPostCardDataList(posts.slice(0, 4), {
    categorySlug,
    imageWidth: 900,
  });
  return {
    hero: cards[0] ?? null,
    secondary: cards.slice(1, 4),
  };
}

export function CategoryArchiveView({
  data,
}: {
  data: CategoryArchivePageData;
}) {
  const jsonLd = buildCategoryArchiveJsonLd(
    data.category,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const heading = pagedHeading(data.category.title, data.pageNumber);
  const showFeatured = data.pageNumber === 1;
  const { hero, secondary } = previewFeaturedCards(
    data.posts,
    data.category.slug,
  );
  const gridPosts = toPostCardDataList(data.posts, {
    categorySlug: data.category.slug,
  });

  return (
    <CategoryLandingLayout
      jsonLd={jsonLd}
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Blog", href: "/" },
            { label: data.category.title },
          ]}
        />
      }
      header={
        <CategoryHeader
          title={heading}
          description={data.category.description}
          descriptionText={data.category.descriptionText}
        />
      }
      featured={
        showFeatured ? (
          <CategoryFeaturedSection hero={hero} secondary={secondary} />
        ) : undefined
      }
      listing={
        <CategoryListingSection
          pagination={
            <Pagination
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              hrefForPage={(page) =>
                categoryPageHref(data.category.slug, page, data.filters)
              }
              ariaLabel="Category archive pagination"
            />
          }
        >
          <PostList
            posts={gridPosts}
            columns={3}
            emptyMessage="No posts match your filters in this category."
          />
        </CategoryListingSection>
      }
      cta={<CtaRfq />}
    />
  );
}
