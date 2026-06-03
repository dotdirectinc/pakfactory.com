import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import { Breadcrumb } from "@/components/breadcrumb";
import { SearchForm } from "@/components/search-form";
import { CategoryChips } from "@/components/category/category-chips";
import { PostCard } from "@/components/post/post-card";
import { Pagination } from "@/components/pagination";
import { PostPopularRail } from "@/components/post/post-popular-rail";
import { categoryHref } from "@/lib/blog-post-url";
import { fetchBlogCategories, fetchPopularPostsThisMonth } from "@/lib/blog-data";
import {
  searchPageHref,
  type SearchListFilters,
  type SearchPageData,
} from "@/lib/blog-search";

type SearchViewProps = {
  data: SearchPageData;
};

const CRUMBS = [{ label: "Blog", href: "/" }, { label: "Search" }];

/** Search-tuned sidebar: category nav + sort + date. Every form preserves `q`. */
function SearchSidebar({
  query,
  filters,
  categories,
}: {
  query: string;
  filters: SearchListFilters;
  categories: Awaited<ReturnType<typeof fetchBlogCategories>>;
}) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Browse categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {categories.map((cat) => (
              <li key={cat._id ?? cat.slug}>
                <Link
                  href={categoryHref(cat.slug)}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {cat.title}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/search" method="get" className="space-y-3">
            <input type="hidden" name="q" value={query} />
            {filters.year && <input type="hidden" name="year" value={filters.year} />}
            {filters.month && (
              <input type="hidden" name="month" value={filters.month} />
            )}
            <select
              id="search-sort"
              name="sort"
              defaultValue={filters.sort}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
            <button
              type="submit"
              className="text-sm font-medium text-primary hover:underline"
            >
              Apply sort
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/search" method="get" className="space-y-3">
            <input type="hidden" name="q" value={query} />
            {filters.sort !== "relevance" && (
              <input type="hidden" name="sort" value={filters.sort} />
            )}
            <div className="space-y-1">
              <Label htmlFor="search-year">Year</Label>
              <Input
                id="search-year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                placeholder="e.g. 2025"
                defaultValue={filters.year ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-month">Month</Label>
              <Input
                id="search-month"
                name="month"
                type="number"
                min={1}
                max={12}
                placeholder="1–12"
                defaultValue={filters.month ?? ""}
              />
            </div>
            <button
              type="submit"
              className="text-sm font-medium text-primary hover:underline"
            >
              Apply date filter
            </button>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
}

export async function SearchView({ data }: SearchViewProps) {
  const { query, searchTerm, posts, totalCount, pageNumber, totalPages, filters } =
    data;
  const hasActiveFilters =
    Boolean(filters.year) || Boolean(filters.month) || filters.sort !== "relevance";

  // ── Empty state — no query yet ─────────────────────────────────────────────
  if (!searchTerm) {
    const categories = await fetchBlogCategories();
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumb items={CRUMBS} />
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Search the blog
        </h1>
        <p className="mt-3 text-muted-foreground">
          Find packaging insights, trends, and guides by keyword.
        </p>
        <SearchForm className="mt-6" />
        {categories.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Popular topics
            </h2>
            <CategoryChips categories={categories} className="mt-3" />
          </div>
        )}
      </div>
    );
  }

  // ── Zero-results state — query, but nothing matched ────────────────────────
  if (totalCount === 0) {
    const popular = await fetchPopularPostsThisMonth();
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumb items={CRUMBS} />
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          No results for “{query}”
        </h1>
        <p className="mt-3 text-muted-foreground">
          We couldn’t find any articles matching your search. Try different or
          broader keywords.
        </p>
        <SearchForm defaultQuery={query} className="mt-6" />
        <PostPopularRail posts={popular} className="mt-12" />
      </div>
    );
  }

  // ── Results state ──────────────────────────────────────────────────────────
  const categories = await fetchBlogCategories();
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <Breadcrumb items={CRUMBS} />
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Search results
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {totalCount === 1 ? "1 result" : `${totalCount} results`} for “{query}”
        </p>
        <SearchForm defaultQuery={query} className="mt-6 max-w-xl" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          {hasActiveFilters && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Filters applied
              </span>
              <Link
                href={searchPageHref(query, 1, { sort: "relevance" })}
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear all
              </Link>
            </div>
          )}

          {posts.length === 0 ? (
            <p className="text-muted-foreground">No posts on this page.</p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post._id}>
                  <PostCard post={post} categorySlug={post.categorySlug} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            hrefForPage={(page) => searchPageHref(query, page, filters)}
            ariaLabel="Search results pagination"
          />
        </div>

        <SearchSidebar query={query} filters={filters} categories={categories} />
      </div>
    </div>
  );
}
