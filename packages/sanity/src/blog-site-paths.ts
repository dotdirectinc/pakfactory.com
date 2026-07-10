/**
 * Curated blog App Router paths that are not Sanity documents (or not preferred
 * as CMS picks). Used by Studio link fields (`internalKind: 'path'`) and blog
 * href resolution.
 *
 * Prefer this list over free-form relative paths so editors cannot typo routes.
 * CMS-managed singletons (home, topics, search, contribute) are linked via
 * Internal → CMS document instead.
 */

export const BLOG_SITE_PATHS = [
  { title: "Home", value: "/" },
  { title: "All posts", value: "/all" },
] as const;

export type BlogSitePath = (typeof BLOG_SITE_PATHS)[number]["value"];

const BLOG_SITE_PATH_VALUES = new Set<string>(
  BLOG_SITE_PATHS.map((entry) => entry.value),
);

export function isBlogSitePath(value: string | null | undefined): value is BlogSitePath {
  if (!value) return false;
  return BLOG_SITE_PATH_VALUES.has(value);
}

/** Sanity `options.list` entries for the sitePath field. */
export const BLOG_SITE_PATH_OPTIONS = BLOG_SITE_PATHS.map(({ title, value }) => ({
  title,
  value,
}));
