import {
  buildUrlset,
  xmlResponse,
  type SitemapUrlEntry,
} from "@pakfactory/sitemap";
import { blogLanguageParams } from "@/lib/blog-language";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";

/**
 * Factory for the **taxonomy-shaped** sitemaps — the ones that are just
 * "fetch a list of slugs, emit one `<url>` each" (PROD-2179 Part B).
 *
 * Covers `authors-sitemap.xml`, `categories-sitemap.xml` and
 * `pages-sitemap.xml`.
 *
 * Deliberately does **not** cover:
 *
 * - `posts-sitemap/[page]` and `topics-sitemap/[page]` — these parse a dynamic
 *   segment (tolerating an optional `.xml` suffix), paginate via
 *   `SITEMAP_GROUP_SIZE`, and have **two distinct 404 policies** (malformed page
 *   vs. an empty page past the end). Those are deliberate SEO decisions, not
 *   boilerplate.
 * - `sitemap.xml` — a sitemap *index*, a different builder entirely.
 * - `sitemap.xsl` — a static stylesheet.
 * - the two 6-line 301 stubs.
 *
 * This lives in the app rather than `@pakfactory/sitemap` because it performs
 * I/O and depends on blog config (the Sanity client, `absoluteUrl`). The package
 * stays pure string building.
 *
 * Note: `export const revalidate` cannot come from here — Next requires it to be
 * a statically analyzable literal in the route file itself, so each route keeps
 * its own.
 *
 * ## On `lastmod` (PROD-2194)
 *
 * Google consumes `<lastmod>` only "if it's consistently and verifiably
 * accurate", and discounts the field site-wide when it isn't. Taxonomy archives
 * (categories, authors, topics) carry **no document-level content date** — the
 * previous implementation used Sanity's `_updatedAt`, which bumps on any write,
 * so every entry ended up stamped with the content-migration date (36 of 36
 * topics shared one value). Those routes now omit `lastmod` entirely: a `<url>`
 * needs only `<loc>`, and no date beats a false one.
 *
 * Routes that do have a real content date pass `lastmodFrom` — see
 * `pages-sitemap.xml`.
 *
 * `changefreq` and `priority` are gone repo-wide: Google ignores both, and the
 * blog emitted one constant value for each. See `@pakfactory/sitemap`.
 */

/** Minimum shape every taxonomy sitemap query must project. */
export type SitemapRow = {
  slug: string;
  publishedAt?: string;
};

export type TaxonomySitemapConfig<Row extends SitemapRow = SitemapRow> = {
  /** GROQ returning `{ slug, … }[]`. */
  query: string;
  /** Slug → site-relative path (`authorHref`, `categoryHref`, …). */
  href: (slug: string) => string;
  /** Emitted before the fetched entries (e.g. `/`, `/all`, `/contribute`). */
  staticEntries?: SitemapUrlEntry[];
  /**
   * Real content date for a row. Omit the option entirely for taxonomy
   * archives, which have none. Return `undefined` to skip `lastmod` for one row.
   */
  lastmodFrom?: (row: Row) => string | undefined;
};

const HTTP_CACHE_SECONDS = 60;

/** `YYYY-MM-DD`, or nothing when there is no usable date. */
function toLastmod(raw: string | undefined): { lastmod?: string } {
  return raw ? { lastmod: new Date(raw).toISOString().slice(0, 10) } : {};
}

/** Build the `GET` handler for one taxonomy sitemap route. */
export function makeTaxonomySitemap<Row extends SitemapRow = SitemapRow>(
  config: TaxonomySitemapConfig<Row>,
) {
  const { query, href, staticEntries = [], lastmodFrom } = config;

  return async function GET(): Promise<Response> {
    const entries: SitemapUrlEntry[] = [...staticEntries];

    // Sanity being unconfigured is not an error: the route still serves a valid
    // urlset containing whatever static entries it has.
    if (isSanityConfigured()) {
      const rows = await getPublishedSanityClient()
        .fetch<Row[]>(query, blogLanguageParams())
        .catch(() => [] as Row[]);

      for (const row of rows) {
        entries.push({
          loc: absoluteUrl(href(row.slug)),
          ...toLastmod(lastmodFrom?.(row)),
        });
      }
    }

    return xmlResponse(buildUrlset(entries, sitemapXslUrl()), HTTP_CACHE_SECONDS);
  };
}
