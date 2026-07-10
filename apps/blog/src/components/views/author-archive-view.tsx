import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageDielineBlockRail } from "@/components/layout/page-dieline-section";
import { Pagination } from "@/components/modules/pagination";
import { PerPageSelect } from "@/components/modules/per-page-select";
import { PostList } from "@/components/modules/post-list";
import { AuthorHeader } from "@/components/views/author-header";
import { AuthorLandingLayout } from "@/components/views/author-landing-layout";
import { AuthorListingSection } from "@/components/views/author-listing-section";
import { buildAuthorJsonLd } from "@/lib/author-jsonld";
import {
  authorPageHref,
  type AuthorArchivePageData,
} from "@/lib/blog-author";
import { PAGE_SIZE_OPTIONS } from "@/lib/blog-archive";
import { sanityImageUrl } from "@/lib/sanity-image";

export function AuthorArchiveView({ data }: { data: AuthorArchivePageData }) {
  const jsonLd = buildAuthorJsonLd(
    data.author,
    sanityImageUrl(data.author.photo, 400),
  );
  const perPage = data.perPage;

  return (
    <AuthorLandingLayout
      jsonLd={jsonLd}
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Blog", href: "/" },
            { label: "Authors" },
            { label: data.author.name },
          ]}
        />
      }
      header={<AuthorHeader author={data.author} />}
    >
      <AuthorListingSection
        pagination={
          <Pagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            hrefForPage={(page) =>
              authorPageHref(data.author.slug, page, perPage)
            }
            ariaLabel="Author archive pagination"
            rightSlot={
              <PerPageSelect
                value={perPage}
                options={PAGE_SIZE_OPTIONS.map((size) => ({
                  size,
                  href: authorPageHref(data.author.slug, 1, size),
                }))}
              />
            }
          />
        }
      >
        <PostList
          posts={data.posts}
          columns={3}
          priorityFirst={data.pageNumber === 1}
          emptyMessage="No posts yet from this author."
        />
      </AuthorListingSection>
      <PageDielineBlockRail>
        <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
      </PageDielineBlockRail>
    </AuthorLandingLayout>
  );
}
