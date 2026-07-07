import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Pagination } from "@/components/modules/pagination";
import { PostList } from "@/components/modules/post-list";
import { PageHeader } from "@/components/modules/page-header";
import { TopicRelatedPills } from "@/components/modules/topic-related-pills";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { CtaRfq } from "@/components/blocks/cta-rfq";
import { PageDielineBlockRail, PageDielineSection } from "@/components/layout/page-dieline-section";
import { TopicLandingLayout } from "@/components/views/topic-landing-layout";
import { TopicListingSection } from "@/components/views/topic-listing-section";
import { pagedHeading } from "@/lib/archive-format";
import {
  tagPageHref,
  type TagArchivePageData,
} from "@/lib/blog-tag-archive";
import { toPostCardDataList } from "@/lib/post-card-data";
import { buildTagArchiveJsonLd } from "@/lib/tag-archive-jsonld";

const RFQ_HEADING = "Let's collaborate and craft your vision";

export function TopicArchiveView({ data }: { data: TagArchivePageData }) {
  const jsonLd = buildTagArchiveJsonLd(
    data.tag,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const heading = pagedHeading(data.tag.title, data.pageNumber);
  const gridPosts = toPostCardDataList(data.posts);

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
          belowContent={
            <TopicRelatedPills topics={data.cooccurringTags} />
          }
        />
      }
    >
      <TopicListingSection
        pagination={
          <Pagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            hrefForPage={(page) =>
              tagPageHref(data.tag.slug, page, data.filters)
            }
            ariaLabel="Topic archive pagination"
          />
        }
      >
        <PostList
          posts={gridPosts}
          columns={3}
          emptyMessage="No posts match your filters for this topic."
        />
      </TopicListingSection>
      <PageDielineBlockRail>
        <CtaNewsletter />
      </PageDielineBlockRail>
      <PageDielineSection innerClassName="py-10">
        <CtaRfq heading={RFQ_HEADING} />
      </PageDielineSection>
    </TopicLandingLayout>
  );
}
