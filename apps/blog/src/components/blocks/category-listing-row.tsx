import { Pagination } from "@/components/modules/pagination";
import { PerPageSelect } from "@/components/modules/per-page-select";
import { PostList } from "@/components/modules/post-list";
import { CategoryListingSection } from "@/components/views/category-listing-section";
import {
  categoryPageHref,
  type CategoryListFilters,
} from "@/lib/blog-category-archive";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardDataList } from "@/lib/post-card-data";

type CategoryListingRowProps = {
  heading?: string;
  posts: HomePostCard[];
  pageNumber: number;
  totalPages: number;
  categorySlug: string;
  filters: CategoryListFilters;
  perPage?: number;
};

/** Paginated post grid for a category archive page (fixed template section). */
export function CategoryListingRow({
  heading,
  posts,
  pageNumber,
  totalPages,
  categorySlug,
  filters,
  perPage,
}: CategoryListingRowProps) {
  const gridPosts = toPostCardDataList(posts, { categorySlug });
  const sectionHeading = heading?.trim();

  return (
    <CategoryListingSection
      pagination={
        <Pagination
          pageNumber={pageNumber}
          totalPages={totalPages}
          hrefForPage={(page) => categoryPageHref(categorySlug, page, filters, perPage)}
          ariaLabel="Category archive pagination"
          rightSlot={<PerPageSelect currentPerPage={perPage} />}
        />
      }
    >
      {sectionHeading ? (
        <h2 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">
          {sectionHeading}
        </h2>
      ) : null}
      <PostList
        posts={gridPosts}
        columns={3}
        emptyMessage="No posts match your filters in this category."
      />
    </CategoryListingSection>
  );
}
