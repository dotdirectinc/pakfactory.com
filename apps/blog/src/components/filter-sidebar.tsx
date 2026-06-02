import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import type { BlogCategoryChip } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";

/** Structural filter state shared by any faceted archive (category, search, …). */
export type SidebarFilters = {
  tag?: string;
  author?: string;
  year?: string;
  month?: string;
  sort?: string;
};

type FilterSidebarProps = {
  /** Category nav list (always shown). */
  categories: BlogCategoryChip[];
  /** Highlight + scope copy for the active category, when on a category archive. */
  currentCategorySlug?: string;
  scopeLabel?: string;
  /** Facet options — omit a facet to hide its card. */
  tags?: { _id?: string; slug: string; title: string }[];
  authors?: { _id?: string; slug: string; name: string }[];
  filters: SidebarFilters;
  /** Href to apply a facet (page resets to 1). Caller owns the route's URL scheme. */
  facetHref: (filters: SidebarFilters) => string;
  /** GET-form target (path, no query) for the Sort form. */
  sortFormAction: string;
  /** GET-form target for the Date form (preserves tag/author/sort as query). */
  dateFormAction: string;
};

/**
 * Faceted "Filter results" sidebar shared across faceted archives (category
 * today, search next). Route-agnostic: callers pass `facetHref` and the form
 * actions so the component never references a specific route's helpers.
 */
export function FilterSidebar({
  categories,
  currentCategorySlug,
  scopeLabel,
  tags,
  authors,
  filters,
  facetHref,
  sortFormAction,
  dateFormAction,
}: FilterSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {categories.map((cat) => (
              <li key={cat._id ?? cat.slug}>
                <Link
                  href={categoryHref(cat.slug)}
                  className={
                    cat.slug === currentCategorySlug
                      ? "font-medium text-foreground underline-offset-4 hover:underline"
                      : "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  }
                  aria-current={cat.slug === currentCategorySlug ? "page" : undefined}
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
          <form action={sortFormAction} method="get" className="space-y-3">
            {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
            {filters.author && (
              <input type="hidden" name="author" value={filters.author} />
            )}
            {filters.year && <input type="hidden" name="year" value={filters.year} />}
            {filters.month && (
              <input type="hidden" name="month" value={filters.month} />
            )}
            <select
              id="filter-sort"
              name="sort"
              defaultValue={filters.sort}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
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

      {tags && tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {tags.map((tag) => (
                <li key={tag._id ?? tag.slug}>
                  <Link
                    href={facetHref({ ...filters, tag: tag.slug })}
                    className={
                      filters.tag === tag.slug
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    {tag.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {authors && authors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {authors.map((author) => (
                <li key={author._id ?? author.slug}>
                  <Link
                    href={facetHref({ ...filters, author: author.slug })}
                    className={
                      filters.author === author.slug
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    {author.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={dateFormAction} method="get" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="filter-year">Year</Label>
              <Input
                id="filter-year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                placeholder="e.g. 2025"
                defaultValue={filters.year ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-month">Month</Label>
              <Input
                id="filter-month"
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

      {scopeLabel && (
        <p className="text-xs text-muted-foreground">
          Filtering applies to {scopeLabel} posts only.
        </p>
      )}
    </aside>
  );
}
