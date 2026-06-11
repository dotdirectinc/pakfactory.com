import { ActiveFilters } from "@/components/common/active-filters";
import { ArchiveLayout } from "@/components/common/archive-layout";
import { PostList } from "@/components/post/post-list";
import { pagedHeading, postCountLabel } from "@/lib/archive-format";
import { toPostCardDataList } from "@/lib/post-card-data";
import { buildTagArchiveJsonLd } from "@/lib/tag-archive-jsonld";
import {
  tagPageHref,
  type TagArchivePageData,
  type TagListFilters,
} from "@/lib/blog-tag-archive";
import { tagGroupTitle } from "@/lib/tag-groups";

export function TagArchiveView({ data }: { data: TagArchivePageData }) {
  const jsonLd = buildTagArchiveJsonLd(
    data.tag,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const heading = pagedHeading(data.tag.title, data.pageNumber);

  return (
    <ArchiveLayout
      jsonLd={jsonLd}
      crumbs={[{ label: "Blog", href: "/" }, { label: data.tag.title }]}
      kicker={tagGroupTitle(data.tag.tagGroup) || undefined}
      heading={heading}
      intro={
        <>
          {data.tag.descriptionText?.trim() && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {data.tag.descriptionText.trim()}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {postCountLabel(data.totalCount)}
          </p>
        </>
      }
      filters={
        <ActiveFilters
          pageNumber={data.pageNumber}
          filters={data.filters}
          hrefFor={(page, filters) =>
            tagPageHref(data.tag.slug, page, filters as TagListFilters)
          }
          authors={data.authors}
        />
      }
      pagination={{
        pageNumber: data.pageNumber,
        totalPages: data.totalPages,
        hrefForPage: (page) => tagPageHref(data.tag.slug, page, data.filters),
        ariaLabel: "Tag archive pagination",
      }}
    >
      <PostList
        posts={toPostCardDataList(data.posts)}
        columns={4}
        emptyMessage="No posts match your filters for this tag."
      />
    </ArchiveLayout>
  );
}
