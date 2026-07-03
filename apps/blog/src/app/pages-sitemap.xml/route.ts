import { BLOG_LANDING_PAGES_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { blogPageDetailHref } from "@/lib/blog-page";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, xmlResponse, type SitemapUrlEntry } from "@/lib/sitemap/xml";

export const revalidate = 60;

export async function GET() {
  const entries: SitemapUrlEntry[] = [
    { loc: absoluteUrl("/"), changefreq: "daily", priority: 1 },
    // Indexable non-post routes: home + code routes + CMS landing/static pages
    // (appended below). `/all` is the posts archive index — it changes whenever
    // a post publishes. `/search` is noindex, so it's excluded.
    { loc: absoluteUrl("/all"), changefreq: "daily", priority: 0.8 },
    { loc: absoluteUrl("/contribute"), changefreq: "monthly", priority: 0.5 },
  ];

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const params = blogLanguageParams();
    const blogSettings = await fetchBlogSettings();
    const postSitemap = blogSettings?.postDefaults;

    const changefreq =
      postSitemap?.sitemapChangefreq ?? "monthly";
    const basePriority = postSitemap?.sitemapPriority ?? 0.7;

    const landingPages = await client
      .fetch<{ slug: string; publishedAt?: string; _updatedAt?: string }[]>(
        BLOG_LANDING_PAGES_SITEMAP_QUERY,
        params,
      )
      .catch(() => [] as { slug: string; publishedAt?: string; _updatedAt?: string }[]);

    for (const page of landingPages) {
      const lastmod = page._updatedAt ?? page.publishedAt;
      entries.push({
        loc: absoluteUrl(blogPageDetailHref(page.slug)),
        ...(lastmod ? { lastmod: new Date(lastmod).toISOString().slice(0, 10) } : {}),
        changefreq,
        priority: basePriority * 0.7,
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
