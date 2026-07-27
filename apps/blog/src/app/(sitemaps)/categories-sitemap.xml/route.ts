import {
  buildUrlset,
  xmlResponse,
  type SitemapUrlEntry,
} from "@pakfactory/sitemap";
import { CATEGORIES_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { blogLanguageParams } from "@/lib/blog-language";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { categoryHref } from "@/lib/blog-post-url";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { isCategoryHiddenAsEmpty } from "@/lib/seo";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";

export const revalidate = 60;

/**
 * Categories sitemap. Emits only categories whose archive is indexable, using the
 * SAME rule as the page `<meta robots>` so the sitemap can't drift from it (the
 * exact hazard the topics-sitemap handler documents). A category is listed iff:
 *   - it is not manually noindexed (`allowIndex != false`), and
 *   - it is not hidden as empty (PROD-2133: 0-post categories are noindex when the
 *     "Hide empty categories" toggle is on — `categoryDefaults.hideEmptyCategory`).
 * No `lastmod` — see the taxonomy-sitemap note (PROD-2194).
 */
type CategorySitemapRow = {
  slug: string;
  allowIndex?: boolean | null;
  postCount: number;
};

const HTTP_CACHE_SECONDS = 60;

export async function GET(): Promise<Response> {
  const entries: SitemapUrlEntry[] = [];

  // Unconfigured Sanity is not an error: serve a valid (empty) urlset.
  if (isSanityConfigured()) {
    const [rows, settings] = await Promise.all([
      getPublishedSanityClient()
        .fetch<CategorySitemapRow[]>(
          CATEGORIES_FOR_SITEMAP_QUERY,
          blogLanguageParams(),
        )
        .catch(() => [] as CategorySitemapRow[]),
      fetchBlogSettings(),
    ]);
    const hideEmptyCategory = settings?.categoryDefaults?.hideEmptyCategory;

    for (const row of rows) {
      const indexable =
        row.allowIndex !== false &&
        !isCategoryHiddenAsEmpty(row.postCount, hideEmptyCategory);
      if (!indexable) continue;
      entries.push({ loc: absoluteUrl(categoryHref(row.slug)) });
    }
  }

  return xmlResponse(
    buildUrlset(entries, sitemapXslUrl()),
    HTTP_CACHE_SECONDS,
  );
}
