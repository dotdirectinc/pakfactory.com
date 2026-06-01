import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import {
  categoryPageHref,
  type CategoryListFilters,
} from "@/lib/blog-category-archive";

type CategoryActiveFiltersProps = {
  categorySlug: string;
  pageNumber: number;
  filters: CategoryListFilters;
  tags: { slug: string; title: string }[];
  authors: { slug: string; name: string }[];
};

function without(
  filters: CategoryListFilters,
  key: keyof CategoryListFilters,
): CategoryListFilters {
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

export function CategoryActiveFilters({
  categorySlug,
  pageNumber,
  filters,
  tags,
  authors,
}: CategoryActiveFiltersProps) {
  const chips: { label: string; href: string }[] = [];

  if (filters.tag) {
    const label = tags.find((t) => t.slug === filters.tag)?.title ?? filters.tag;
    chips.push({
      label: `Tag: ${label}`,
      href: categoryPageHref(categorySlug, 1, without(filters, "tag")),
    });
  }
  if (filters.author) {
    const label =
      authors.find((a) => a.slug === filters.author)?.name ?? filters.author;
    chips.push({
      label: `Author: ${label}`,
      href: categoryPageHref(categorySlug, 1, without(filters, "author")),
    });
  }
  if (filters.year) {
    const label = filters.month
      ? `${filters.year}-${filters.month.padStart(2, "0")}`
      : filters.year;
    chips.push({
      label: `Date: ${label}`,
      href: categoryPageHref(categorySlug, 1, without(filters, "year")),
    });
  } else if (filters.month) {
    chips.push({
      label: `Month: ${filters.month}`,
      href: categoryPageHref(categorySlug, 1, without(filters, "month")),
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
        href={categoryPageHref(categorySlug, pageNumber, { sort: filters.sort })}
        className="text-sm font-medium text-primary hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
