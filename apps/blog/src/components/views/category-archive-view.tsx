import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CategoryListingRow } from "@/components/blocks/category-listing-row";
import { CtaRfq } from "@/components/blocks/cta-rfq";
import { PostCategoryFeaturedRow } from "@/components/blocks/post-category-featured-row";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { PageHeader } from "@/components/modules/page-header";
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
        <PageHeader
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
      <PageDielineSection innerClassName="py-10">
        <CtaRfq />
      </PageDielineSection>
    </CategoryLandingLayout>
  );
}
