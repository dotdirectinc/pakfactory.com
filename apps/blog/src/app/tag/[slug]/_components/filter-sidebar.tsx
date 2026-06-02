import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import {
  tagPageHref,
  type TagFacet,
  type TagFacetAuthor,
  type TagListFilters,
} from "@/lib/blog-tag-archive";
import { TAG_GROUPS } from "@/lib/tag-groups";

type TagFilterSidebarProps = {
  tagSlug: string;
  /** Axis of the current tag — its row is hidden (redundant on its own page). */
  currentTagGroup?: string;
  cooccurringTags: TagFacet[];
  authors: TagFacetAuthor[];
  filters: TagListFilters;
  pageNumber: number;
};

export function TagFilterSidebar({
  tagSlug,
  currentTagGroup,
  cooccurringTags,
  authors,
  filters,
  pageNumber,
}: TagFilterSidebarProps) {
  const sortActionHref = tagPageHref(tagSlug, pageNumber, { sort: filters.sort });

  // Group co-occurring tags by axis, skipping the current tag's own axis.
  const axisRows = TAG_GROUPS.filter((axis) => axis.value !== currentTagGroup)
    .map((axis) => ({
      ...axis,
      tags: cooccurringTags.filter((t) => t.tagGroup === axis.value),
    }))
    .filter((axis) => axis.tags.length > 0);

  return (
    <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={sortActionHref.split("?")[0]} method="get" className="space-y-3">
            {filters.author && (
              <input type="hidden" name="author" value={filters.author} />
            )}
            {filters.year && <input type="hidden" name="year" value={filters.year} />}
            {filters.month && (
              <input type="hidden" name="month" value={filters.month} />
            )}
            <select
              id="tag-sort"
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

      {axisRows.map((axis) => (
        <Card key={axis.value}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{axis.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {axis.tags.map((tag) => (
                <li key={tag._id ?? tag.slug}>
                  <Link
                    href={tagPageHref(tag.slug, 1, { sort: "newest" })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {tag.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {authors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {authors.map((author) => (
                <li key={author._id ?? author.slug}>
                  <Link
                    href={tagPageHref(tagSlug, 1, {
                      ...filters,
                      author: author.slug,
                    })}
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
          <form
            action={tagPageHref(tagSlug, 1, {
              author: filters.author,
              sort: filters.sort,
            }).split("?")[0]}
            method="get"
            className="space-y-3"
          >
            {filters.author && (
              <input type="hidden" name="author" value={filters.author} />
            )}
            {filters.sort !== "newest" && (
              <input type="hidden" name="sort" value={filters.sort} />
            )}
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
    </aside>
  );
}
