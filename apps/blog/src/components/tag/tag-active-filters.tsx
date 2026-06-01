import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { tagPageHref, type TagListFilters } from "@/lib/blog-tag-archive";

type TagActiveFiltersProps = {
  tagSlug: string;
  pageNumber: number;
  filters: TagListFilters;
  authors: { slug: string; name: string }[];
};

function without(
  filters: TagListFilters,
  key: keyof TagListFilters,
): TagListFilters {
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

export function TagActiveFilters({
  tagSlug,
  pageNumber,
  filters,
  authors,
}: TagActiveFiltersProps) {
  const chips: { label: string; href: string }[] = [];

  if (filters.author) {
    const label =
      authors.find((a) => a.slug === filters.author)?.name ?? filters.author;
    chips.push({
      label: `Author: ${label}`,
      href: tagPageHref(tagSlug, 1, without(filters, "author")),
    });
  }
  if (filters.year) {
    const label = filters.month
      ? `${filters.year}-${filters.month.padStart(2, "0")}`
      : filters.year;
    chips.push({
      label: `Date: ${label}`,
      href: tagPageHref(tagSlug, 1, without(filters, "year")),
    });
  } else if (filters.month) {
    chips.push({
      label: `Month: ${filters.month}`,
      href: tagPageHref(tagSlug, 1, without(filters, "month")),
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
        href={tagPageHref(tagSlug, pageNumber, { sort: filters.sort })}
        className="text-sm font-medium text-primary hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
