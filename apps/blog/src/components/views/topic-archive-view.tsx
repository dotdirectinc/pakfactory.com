import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/modules/page-header";
import { TopicRelatedPills } from "@/components/modules/topic-related-pills";
import type { FilterOption } from "@/components/ui/listing-filter-bar";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { PageDielineBlockRail } from "@/components/layout/page-dieline-section";
import { TopicLandingLayout } from "@/components/views/topic-landing-layout";
import { TopicListingClient } from "@/components/views/topic-listing-client";
import { pagedHeading } from "@/lib/archive-format";
import type { TagArchivePageData } from "@/lib/blog-tag-archive";
import { buildTagArchiveJsonLd } from "@/lib/tag-archive-jsonld";

export function TopicArchiveView({
  data,
  categoryOptions,
}: {
  data: TagArchivePageData;
  categoryOptions: FilterOption[];
}) {
  const jsonLd = buildTagArchiveJsonLd(
    data.tag,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const heading = pagedHeading(data.tag.title, data.pageNumber);

  return (
    <TopicLandingLayout
      jsonLd={jsonLd}
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Blog", href: "/" },
            { label: "Topics", href: "/topics" },
            { label: data.tag.title },
          ]}
        />
      }
      header={
        <PageHeader
          title={heading}
          descriptionText={data.tag.descriptionText}
          belowContent={<TopicRelatedPills topics={data.cooccurringTags} />}
        />
      }
    >
      <TopicListingClient
        tagSlug={data.tag.slug}
        allPosts={data.allPosts}
        categoryOptions={categoryOptions}
        initialFilters={data.filters}
        initialPage={data.pageNumber}
        initialPerPage={data.perPage}
      />
      <PageDielineBlockRail>
        <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
      </PageDielineBlockRail>
    </TopicLandingLayout>
  );
}
