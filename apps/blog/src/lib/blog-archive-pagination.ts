import {
  isArchivePageOutOfRange,
  parseArchivePageParam,
} from "@/lib/blog-archive";

export { isArchivePageOutOfRange, parseArchivePageParam };

export type PaginationRouteResult =
  | { status: "ok"; pageNumber: number }
  | { status: "not-found" }
  | { status: "redirect"; href: string };

/** Parse `/page/[n]` param; redirect page 1 to canonical page-one href. */
export function resolvePaginationRoute(
  raw: string,
  pageOneHref: string,
): PaginationRouteResult {
  const pageNumber = parseArchivePageParam(raw);
  if (pageNumber === null) return { status: "not-found" };
  if (pageNumber === 1) return { status: "redirect", href: pageOneHref };
  return { status: "ok", pageNumber };
}

export function paginatedListTitle(label: string, pageNumber: number): string {
  if (pageNumber <= 1) return label;
  return `${label} - Page ${pageNumber} | PakFactory Blog`;
}

const BLOG_BRAND_SUFFIX = " | PakFactory Blog";

/**
 * Paginated title from an already-resolved page-1 title.
 * Re-appends `| PakFactory Blog` only when the resolved title already carried it —
 * never invents brand for a bare name (so misconfig stays visible).
 */
export function paginatedTitleFromResolved(
  resolvedTitle: string,
  pageNumber: number,
): string {
  if (pageNumber <= 1) return resolvedTitle;
  const trimmed = resolvedTitle.trim();
  const hasBrand = trimmed.endsWith(BLOG_BRAND_SUFFIX);
  const base = hasBrand
    ? trimmed.slice(0, -BLOG_BRAND_SUFFIX.length).trimEnd()
    : trimmed;
  if (!base) return trimmed;
  return hasBrand
    ? `${base} - Page ${pageNumber}${BLOG_BRAND_SUFFIX}`
    : `${base} - Page ${pageNumber}`;
}

export function paginatedEntityDescription(
  entityTitle: string,
  descriptionText: string | undefined,
  pageNumber: number,
): string {
  if (pageNumber <= 1) {
    return descriptionText?.trim().slice(0, 160) || "";
  }
  return (
    descriptionText?.trim().slice(0, 160) ||
    `Page ${pageNumber} of ${entityTitle} on PakFactory Blog.`
  );
}
