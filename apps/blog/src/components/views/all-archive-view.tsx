import { FilterArchiveSidebar } from "@/components/modules/filter/filter-archive-sidebar";
import { PerPageSelect } from "@/components/modules/per-page-select";
import { ArchiveLayout } from "@/components/views/archive-layout";
import { PostList } from "@/components/modules/post-list";
import { pagedHeading } from "@/lib/archive-format";
import { toPostCardDataList } from "@/lib/post-card-data";
import { buildAllArchiveJsonLd } from "@/lib/all-archive-jsonld";
import {
  archivePageHref,
  PAGE_SIZE_OPTIONS,
  type AllArchivePageData,
} from "@/lib/blog-archive";
import { fetchBlogCategories } from "@/lib/blog-data";

export async function AllArchiveView({ data }: { data: AllArchivePageData }) {
  const categories = await fetchBlogCategories();
  const jsonLd = buildAllArchiveJsonLd(data.posts, data.pageNumber);
  const heading = pagedHeading("All posts", data.pageNumber);
  const perPage = data.perPage;

  return (
    <ArchiveLayout
      jsonLd={jsonLd}
      crumbs={[{ label: "Blog", href: "/" }, { label: "All posts" }]}
      heading={heading}
      intro={
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every published article, newest first.
          {data.totalCount > 0 && (
            <span className="text-foreground"> {data.totalCount} posts total.</span>
          )}
        </p>
      }
      sidebar={<FilterArchiveSidebar categories={categories} />}
      columns="lg:grid-cols-[minmax(0,1fr)_220px]"
      pagination={{
        pageNumber: data.pageNumber,
        totalPages: data.totalPages,
        hrefForPage: (page) => archivePageHref(page, perPage),
        ariaLabel: "Archive pagination",
        rightSlot: (
          <PerPageSelect
            value={perPage}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              size,
              href: archivePageHref(1, size),
            }))}
          />
        ),
      }}
    >
      <PostList
        posts={toPostCardDataList(data.posts)}
        columns={2}
        emptyMessage="No published posts yet."
      />
    </ArchiveLayout>
  );
}
