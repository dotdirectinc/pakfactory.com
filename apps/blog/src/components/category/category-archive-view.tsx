import { ActiveFilters } from "@/components/common/active-filters";
import { FilterSidebar } from "@/components/common/filter-sidebar";
import { PostArchive } from "@/components/post/post-archive";
import { PostList } from "@/components/post/post-list";
import { toPostCardDataList } from "@/lib/post-card-data";
import { buildCategoryArchiveJsonLd } from "@/lib/category-archive-jsonld";
import {
  categoryPageHref,
  type CategoryArchivePageData,
  type CategoryListFilters,
} from "@/lib/blog-category-archive";
import { PACKAGING_NEWS_SLUG } from "@/lib/blog-categories";
import { fetchBlogCategories } from "@/lib/blog-data";

export async function CategoryArchiveView({
  data,
}: {
  data: CategoryArchivePageData;
}) {
  const allCategories = await fetchBlogCategories();
  const jsonLd = buildCategoryArchiveJsonLd(
    data.category,
    data.posts,
    data.pageNumber,
    data.filters,
  );
  const isPackagingNews = data.category.slug === PACKAGING_NEWS_SLUG;
  const heading =
    data.pageNumber > 1
      ? `${data.category.title} — Page ${data.pageNumber}`
      : data.category.title;

  return (
    <PostArchive
      jsonLd={jsonLd}
      crumbs={[{ label: "Blog", href: "/" }, { label: data.category.title }]}
      heading={heading}
      intro={
        <>
          {data.category.descriptionText?.trim() && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {data.category.descriptionText.trim()}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {data.totalCount === 1 ? "1 post" : `${data.totalCount} posts`}
          </p>
        </>
      }
      filters={
        <ActiveFilters
          pageNumber={data.pageNumber}
          filters={data.filters}
          hrefFor={(page, filters) =>
            categoryPageHref(data.category.slug, page, filters as CategoryListFilters)
          }
          tags={data.tags}
          authors={data.authors}
        />
      }
      sidebar={
        <FilterSidebar
          categories={allCategories}
          currentCategorySlug={data.category.slug}
          scopeLabel={data.category.title}
          tags={data.tags}
          authors={data.authors}
          filters={data.filters}
          facetHref={(filters) =>
            categoryPageHref(data.category.slug, 1, filters as CategoryListFilters)
          }
          sortFormAction={
            categoryPageHref(data.category.slug, data.pageNumber, {
              sort: data.filters.sort,
            }).split("?")[0]!
          }
          dateFormAction={categoryPageHref(data.category.slug, 1, {
            tag: data.filters.tag,
            author: data.filters.author,
            sort: data.filters.sort,
          })}
        />
      }
      pagination={{
        pageNumber: data.pageNumber,
        totalPages: data.totalPages,
        hrefForPage: (page) => categoryPageHref(data.category.slug, page, data.filters),
        ariaLabel: "Category archive pagination",
      }}
    >
      <PostList
        posts={toPostCardDataList(data.posts, {
          categorySlug: data.category.slug,
        })}
        variant={isPackagingNews ? "headline" : "default"}
        layout={isPackagingNews ? "list" : "grid"}
        columns={3}
        emptyMessage="No posts match your filters in this category."
      />
    </PostArchive>
  );
}
