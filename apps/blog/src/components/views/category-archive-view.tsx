import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CategoryListingRow } from "@/components/sections/category-listing-row";
import { CtaRfq } from "@/components/sections/cta-rfq";
import { PostCategoryFeaturedRow } from "@/components/sections/post-category-featured-row";
import { CategoryHeader } from "@/components/views/category-header";
import { CategoryLandingLayout } from "@/components/views/category-landing-layout";
import { pagedHeading } from "@/lib/archive-format";
import { buildCategoryArchiveJsonLd } from "@/lib/category-archive-jsonld";
import type { CategoryArchivePageData } from "@/lib/blog-category-archive";

const FEATURED_HEADING = "Featured Posts";

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
          bannerImageUrl={data.category.bannerImageUrl}
        />
      }
    >
      {data.pageNumber === 1 ? (
        <PostCategoryFeaturedRow
          heading={FEATURED_HEADING}
          posts={data.featuredPosts}
          categorySlug={data.category.slug}
        />
      ) : null}
      <CategoryListingRow
        posts={data.posts}
        pageNumber={data.pageNumber}
        totalPages={data.totalPages}
        categorySlug={data.category.slug}
        filters={data.filters}
      />
      <CtaRfq />
    </CategoryLandingLayout>
  );
}
