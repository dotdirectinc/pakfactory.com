/** Canonical category archive path — `/{categorySlug}` (no `/category` prefix). */
export function categoryHref(categorySlug: string): string {
  return `/${categorySlug}`;
}

/** Canonical tag archive path — `/tag/{tagSlug}` (PROD-1500). */
export function tagHref(tagSlug: string): string {
  return `/tag/${tagSlug}`;
}

/** Canonical author profile path — `/author/{slug}` (PROD-1501). */
export function authorHref(authorSlug: string): string {
  return `/author/${authorSlug}`;
}

/**
 * Canonical post detail path — **always** `/{postSlug}` (root level).
 * A post has exactly one URL; category/tag/search/home are discovery paths only,
 * never URL scoping. The optional `categorySlug` is accepted for call-site
 * compatibility but intentionally ignored. (Reverts PROD-1597's scoped scheme.)
 */
export function postDetailHref(
  postSlug: string,
  _categorySlug?: string | null,
): string {
  return `/${postSlug}`;
}
