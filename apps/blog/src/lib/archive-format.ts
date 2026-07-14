export function pagedHeading(title: string, _pageNumber: number): string {
  return title;
}

export function postCountLabel(totalCount: number): string {
  return totalCount === 1 ? "1 post" : `${totalCount} posts`;
}
