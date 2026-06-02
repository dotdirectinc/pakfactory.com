import { Breadcrumb } from "@/components/breadcrumb";
import { ActiveFilters } from "@/components/active-filters";
import { Pagination } from "@/components/pagination";
import { FilterSidebar } from "@/components/filter-sidebar";
import { PostCard } from "@/components/post/post-card";
import { buildCategoryArchiveJsonLd } from "@/lib/category-archive-jsonld";
import {
  categoryPageHref,
  type CategoryArchivePageData,
  type CategoryListFilters,
} from "@/lib/blog-category-archive";
import { PACKAGING_NEWS_SLUG } from "@/lib/blog-categories";
import { fetchBlogCategories } from "@/lib/blog-data";

type CategoryArchiveViewProps = {
  data: CategoryArchivePageData;
};

export async function CategoryArchiveView({ data }: CategoryArchiveViewProps) {
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Breadcrumb
            items={[{ label: "Blog", href: "/" }, { label: data.category.title }]}
          />
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          {data.category.descriptionText?.trim() && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {data.category.descriptionText.trim()}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {data.totalCount === 1 ? "1 post" : `${data.totalCount} posts`}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <ActiveFilters
              pageNumber={data.pageNumber}
              filters={data.filters}
              hrefFor={(page, filters) =>
                categoryPageHref(
                  data.category.slug,
                  page,
                  filters as CategoryListFilters,
                )
              }
              tags={data.tags}
              authors={data.authors}
            />

            {data.posts.length === 0 ? (
              <p className="text-muted-foreground">
                No posts match your filters in this category.
              </p>
            ) : isPackagingNews ? (
              <ul className="space-y-4">
                {data.posts.map((post) => (
                  <li key={post._id}>
                    <PostCard
                      post={post}
                      categorySlug={data.category.slug}
                      variant="headline"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {data.posts.map((post) => (
                  <li key={post._id}>
                    <PostCard post={post} categorySlug={data.category.slug} />
                  </li>
                ))}
              </ul>
            )}

            <Pagination
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              hrefForPage={(page) =>
                categoryPageHref(data.category.slug, page, data.filters)
              }
              ariaLabel="Category archive pagination"
            />
          </div>

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
        </div>
      </div>
    </>
  );
}
