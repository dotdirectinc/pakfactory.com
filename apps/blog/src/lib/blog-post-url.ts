/** Canonical post detail path — always under `/category/{categorySlug}/{postSlug}` when category is known. */
export function postDetailHref(
  postSlug: string,
  categorySlug?: string | null,
): string {
  if (categorySlug) {
    return `/category/${categorySlug}/${postSlug}`;
  }
  return `/${postSlug}`;
}
