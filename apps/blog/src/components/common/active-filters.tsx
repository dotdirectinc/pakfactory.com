import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";

/**
 * Structural shape shared by category and tag list filters. Tag pages simply
 * never set `tag`, so the same chip logic covers both archives.
 */
export type ActiveFilterValues = {
  tag?: string;
  author?: string;
  year?: string;
  month?: string;
  sort?: string;
};

type ActiveFiltersProps = {
  pageNumber: number;
  filters: ActiveFilterValues;
  /** Build the archive href for a page + filter set (caller knows the route). */
  hrefFor: (page: number, filters: ActiveFilterValues) => string;
  /** Tag label lookup — omit on tag archives (no tag chip there). */
  tags?: { slug: string; title: string }[];
  authors: { slug: string; name: string }[];
};

function without(
  filters: ActiveFilterValues,
  key: keyof ActiveFilterValues,
): ActiveFilterValues {
  const next = { ...filters };
  if (key === "sort") {
    next.sort = "newest";
  } else if (key === "year") {
    delete next.year;
    delete next.month;
  } else {
    delete next[key];
  }
  return next;
}

/**
 * Removable filter chips + "Clear all" shown above a filtered archive grid.
 * Shared across category and tag archives.
 */
export function ActiveFilters({
  pageNumber,
  filters,
  hrefFor,
  tags,
  authors,
}: ActiveFiltersProps) {
  const chips: { label: string; href: string }[] = [];

  if (filters.tag && tags) {
    const label = tags.find((t) => t.slug === filters.tag)?.title ?? filters.tag;
    chips.push({
      label: `Tag: ${label}`,
      href: hrefFor(1, without(filters, "tag")),
    });
  }
  if (filters.author) {
    const label =
      authors.find((a) => a.slug === filters.author)?.name ?? filters.author;
    chips.push({
      label: `Author: ${label}`,
      href: hrefFor(1, without(filters, "author")),
    });
  }
  if (filters.year) {
    const label = filters.month
      ? `${filters.year}-${filters.month.padStart(2, "0")}`
      : filters.year;
    chips.push({
      label: `Date: ${label}`,
      href: hrefFor(1, without(filters, "year")),
    });
  } else if (filters.month) {
    chips.push({
      label: `Month: ${filters.month}`,
      href: hrefFor(1, without(filters, "month")),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="text-sm font-medium text-muted-foreground">Filtered by:</span>
      {chips.map((chip) => (
        <Badge key={chip.label} variant="secondary" asChild>
          <Link href={chip.href}>{chip.label} ×</Link>
        </Badge>
      ))}
      <Link
        href={hrefFor(pageNumber, { sort: filters.sort })}
        className="text-sm font-medium text-primary hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
