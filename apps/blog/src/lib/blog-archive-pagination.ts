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
