import { AUTHORS_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { authorHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, xmlResponse, type SitemapUrlEntry } from "@/lib/sitemap/xml";

export const revalidate = 60;

type SitemapSlugEntry = { slug: string; _updatedAt?: string };

export async function GET() {
  const entries: SitemapUrlEntry[] = [];

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const params = blogLanguageParams();
    const blogSettings = await fetchBlogSettings();
    const authorSitemap = blogSettings?.authorDefaults;

    const changefreq = authorSitemap?.sitemapChangefreq ?? "monthly";
    const priority = authorSitemap?.sitemapPriority ?? 0.3;

    const authors = await client
      .fetch<SitemapSlugEntry[]>(AUTHORS_FOR_SITEMAP_QUERY, params)
      .catch(() => [] as SitemapSlugEntry[]);

    for (const author of authors) {
      entries.push({
        loc: absoluteUrl(authorHref(author.slug)),
        ...(author._updatedAt
          ? { lastmod: new Date(author._updatedAt).toISOString().slice(0, 10) }
          : {}),
        changefreq,
        priority,
      });
    }
  }

  return xmlResponse(buildUrlset(entries), 60);
}
