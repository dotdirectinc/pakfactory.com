export function pagedHeading(title: string, pageNumber: number): string {
  return pageNumber > 1 ? `${title} — Page ${pageNumber}` : title;
}

export function postCountLabel(totalCount: number): string {
  return totalCount === 1 ? "1 post" : `${totalCount} posts`;
}
