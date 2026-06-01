import Link from "next/link";
import { TagActiveFilters } from "@/components/tag/tag-active-filters";
import { TagArchivePagination } from "@/components/tag/tag-archive-pagination";
import { TagFilterSidebar } from "@/components/tag/tag-filter-sidebar";
import { PostCard } from "@/components/post/post-card";
import { buildTagArchiveJsonLd } from "@/lib/tag-archive-jsonld";
import type { TagArchivePageData } from "@/lib/blog-tag-archive";
import { tagGroupTitle } from "@/lib/tag-groups";

type TagArchiveViewProps = {
  data: TagArchivePageData;
};

export function TagArchiveView({ data }: TagArchiveViewProps) {
  const jsonLd = buildTagArchiveJsonLd(
    data.tag,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const kicker = tagGroupTitle(data.tag.tagGroup);
  const heading =
    data.pageNumber > 1
      ? `${data.tag.title} — Page ${data.pageNumber}`
      : data.tag.title;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Blog home
          </Link>
          {kicker && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
              {kicker}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          {data.tag.descriptionText?.trim() && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {data.tag.descriptionText.trim()}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {data.totalCount === 1 ? "1 post" : `${data.totalCount} posts`}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <TagActiveFilters
              tagSlug={data.tag.slug}
              pageNumber={data.pageNumber}
              filters={data.filters}
              authors={data.authors}
            />

            {data.posts.length === 0 ? (
              <p className="text-muted-foreground">
                No posts match your filters for this tag.
              </p>
            ) : (
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {data.posts.map((post) => (
                  <li key={post._id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}

            <TagArchivePagination
              tagSlug={data.tag.slug}
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              filters={data.filters}
            />
          </div>

          <TagFilterSidebar
            tagSlug={data.tag.slug}
            currentTagGroup={data.tag.tagGroup}
            cooccurringTags={data.cooccurringTags}
            authors={data.authors}
            filters={data.filters}
            pageNumber={data.pageNumber}
          />
        </div>
      </div>
    </>
  );
}
