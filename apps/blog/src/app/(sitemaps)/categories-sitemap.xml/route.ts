import { CATEGORIES_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { categoryHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, xmlResponse, type SitemapUrlEntry } from "@pakfactory/sitemap";

export const revalidate = 60;

type SitemapSlugEntry = { slug: string; _updatedAt?: string };

export async function GET() {
  const entries: SitemapUrlEntry[] = [];

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const params = blogLanguageParams();
    const blogSettings = await fetchBlogSettings();
    const categorySitemap = blogSettings?.categoryDefaults;

    const changefreq = categorySitemap?.sitemapChangefreq ?? "weekly";
    const priority = categorySitemap?.sitemapPriority ?? 0.7;

    const categories = await client
      .fetch<SitemapSlugEntry[]>(CATEGORIES_FOR_SITEMAP_QUERY, params)
      .catch(() => [] as SitemapSlugEntry[]);

    for (const cat of categories) {
      entries.push({
        loc: absoluteUrl(categoryHref(cat.slug)),
        ...(cat._updatedAt ? { lastmod: new Date(cat._updatedAt).toISOString().slice(0, 10) } : {}),
        changefreq,
        priority,
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
