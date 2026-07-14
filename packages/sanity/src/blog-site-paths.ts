/**
 * Curated blog App Router paths that are not Sanity documents.
 * Used only for legacy soft-resolve of stored footer `sitePath` / `linkType: 'path'`
 * data after Studio removed the site-path editor option (Internal is CMS-only now).
 *
 * Prefer linking CMS-managed singletons (home, topics, search, contribute) via
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

/** Sanity `options.list` entries — kept for any remaining Studio/seed callers. */
export const BLOG_SITE_PATH_OPTIONS = BLOG_SITE_PATHS.map(({ title, value }) => ({
  title,
  value,
}));
