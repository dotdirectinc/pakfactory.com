import {
  buildUrlset,
  xmlResponse,
  type SitemapUrlEntry,
} from "@pakfactory/sitemap";
import { blogLanguageParams } from "@/lib/blog-language";
import { fetchBlogSettings, type BlogSettings } from "@/lib/blog-settings";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";

/**
 * Factory for the **taxonomy-shaped** sitemaps — the ones that are just
 * "fetch a list of slugs, emit one `<url>` each" (PROD-2179 Part B).
 *
 * Covers `authors-sitemap.xml`, `categories-sitemap.xml` and
 * `pages-sitemap.xml`, which were ~90% identical.
 *
 * Deliberately does **not** cover:
 *
 * - `posts-sitemap/[page]` and `topics-sitemap/[page]` — these parse a dynamic
 *   segment (tolerating an optional `.xml` suffix), paginate via
 *   `SITEMAP_GROUP_SIZE`, and have **two distinct 404 policies** (malformed page
 *   vs. an empty page past the end). Those are deliberate SEO decisions, not
 *   boilerplate; folding them in would mean option knobs that let the two
 *   silently share or silently diverge.
 * - `sitemap.xml` — a sitemap *index*, a different builder entirely.
 * - `sitemap.xsl` — a static stylesheet.
 * - the two 6-line 301 stubs.
 *
 * This lives in the app rather than `@pakfactory/sitemap` because it performs
 * I/O and depends on blog config (`fetchBlogSettings`, the Sanity client,
 * `absoluteUrl`). The package stays pure string building.
 *
 * Note: `export const revalidate` cannot come from here — Next requires it to be
 * a statically analyzable literal in the route file itself, so each route keeps
 * its own.
 */

/** Minimum shape every taxonomy sitemap query must project. */
type SitemapSlugEntry = {
  slug: string;
  _updatedAt?: string;
  publishedAt?: string;
};

export type TaxonomySitemapConfig = {
  /** GROQ returning `{ slug, _updatedAt?, publishedAt? }[]`. */
  query: string;
  /** Slug → site-relative path (`authorHref`, `categoryHref`, …). */
  href: (slug: string) => string;
  /**
   * Which per-type defaults supply `sitemapChangefreq` / `sitemapPriority`.
   * Passed explicitly rather than inferred so an unexpected pairing is visible
   * at the call site — see the note on `pages-sitemap.xml`.
   */
  defaultsKey: keyof BlogSettings;
  /** Used when the Studio singleton leaves the field empty. */
  fallbackChangefreq: string;
  fallbackPriority: number;
  /** Emitted before the fetched entries (e.g. `/`, `/all`, `/contribute`). */
  staticEntries?: SitemapUrlEntry[];
  /** Multiplier on the resolved priority for fetched entries. Default 1. */
  priorityFactor?: number;
};

const HTTP_CACHE_SECONDS = 60;

/** `YYYY-MM-DD`, or nothing when the document carries no usable date. */
function lastmodOf(entry: SitemapSlugEntry): { lastmod?: string } {
  const raw = entry._updatedAt ?? entry.publishedAt;
  return raw ? { lastmod: new Date(raw).toISOString().slice(0, 10) } : {};
}

/** Build the `GET` handler for one taxonomy sitemap route. */
export function makeTaxonomySitemap(config: TaxonomySitemapConfig) {
  const {
    query,
    href,
    defaultsKey,
    fallbackChangefreq,
    fallbackPriority,
    staticEntries = [],
    priorityFactor = 1,
  } = config;

  return async function GET(): Promise<Response> {
    const entries: SitemapUrlEntry[] = [...staticEntries];

    // Sanity being unconfigured is not an error: the route still serves a valid
    // urlset containing whatever static entries it has (matches prior behaviour).
    if (isSanityConfigured()) {
      const settings = await fetchBlogSettings();
      const defaults = settings?.[defaultsKey];
      const changefreq = defaults?.sitemapChangefreq ?? fallbackChangefreq;
      const priority = (defaults?.sitemapPriority ?? fallbackPriority) * priorityFactor;

      const rows = await getPublishedSanityClient()
        .fetch<SitemapSlugEntry[]>(query, blogLanguageParams())
        .catch(() => [] as SitemapSlugEntry[]);

      for (const row of rows) {
        entries.push({
          loc: absoluteUrl(href(row.slug)),
          ...lastmodOf(row),
          changefreq,
          priority,
        });
      }
    }

    return xmlResponse(buildUrlset(entries, sitemapXslUrl()), HTTP_CACHE_SECONDS);
  };
}
