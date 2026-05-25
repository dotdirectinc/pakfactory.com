import Link from "next/link";
import { CategoryActiveFilters } from "@/app/_components/category-active-filters";
import { CategoryArchivePagination } from "@/app/_components/category-archive-pagination";
import { CategoryFilterSidebar } from "@/app/_components/category-filter-sidebar";
import { PostCard } from "@/app/_components/post-card";
import { buildCategoryArchiveJsonLd } from "@/lib/category-archive-jsonld";
import type { CategoryArchivePageData } from "@/lib/blog-category-archive";
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
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Blog home
          </Link>
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
            <CategoryActiveFilters
              categorySlug={data.category.slug}
              pageNumber={data.pageNumber}
              filters={data.filters}
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

            <CategoryArchivePagination
              categorySlug={data.category.slug}
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              filters={data.filters}
            />
          </div>

          <CategoryFilterSidebar
            categorySlug={data.category.slug}
            categoryTitle={data.category.title}
            allCategories={allCategories}
            tags={data.tags}
            authors={data.authors}
            filters={data.filters}
            pageNumber={data.pageNumber}
          />
        </div>
      </div>
    </>
  );
}
