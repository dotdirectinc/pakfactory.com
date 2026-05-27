/** Canonical category archive path — `/{categorySlug}` (no `/category` prefix). */
export function categoryHref(categorySlug: string): string {
  return `/${categorySlug}`;
}

/** Canonical post detail path — always under `/{categorySlug}/{postSlug}` when category is known. */
export function postDetailHref(
  postSlug: string,
  categorySlug?: string | null,
): string {
  if (categorySlug) {
    return `/${categorySlug}/${postSlug}`;
  }
  return `/${postSlug}`;
}
