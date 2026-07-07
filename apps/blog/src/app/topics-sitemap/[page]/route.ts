import { BLOG_SITEMAP_TAGS_PAGE_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { tagHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, SITEMAP_GROUP_SIZE, xmlResponse, type SitemapUrlEntry } from "@/lib/sitemap/xml";

export const revalidate = 60;

type SitemapTopic = { slug: string; _updatedAt?: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: pageStr } = await params;
  // Canonical form is `/topics-sitemap/{n}.xml`; the bare `/topics-sitemap/{n}`
  // (no extension) is still accepted so previously-submitted URLs don't 404.
  const digits = /^(\d+)(?:\.xml)?$/.exec(pageStr)?.[1];
  const page = digits ? parseInt(digits, 10) : NaN;
  if (isNaN(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  const blogSettings = await fetchBlogSettings();
  const tagSitemap = blogSettings?.tagDefaults;
  const changefreq = tagSitemap?.sitemapChangefreq ?? "weekly";
  const priority = tagSitemap?.sitemapPriority ?? 0.5;

  const entries: SitemapUrlEntry[] = [];

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const queryParams = {
      ...blogLanguageParams(),
      start: (page - 1) * SITEMAP_GROUP_SIZE,
      end: page * SITEMAP_GROUP_SIZE,
    };

    const topics = await client
      .fetch<SitemapTopic[]>(BLOG_SITEMAP_TAGS_PAGE_QUERY, queryParams)
      .catch(() => [] as SitemapTopic[]);

    if (topics.length === 0 && page > 1) {
      return new Response("Not found", { status: 404 });
    }

    for (const topic of topics) {
      entries.push({
        loc: absoluteUrl(tagHref(topic.slug)),
        ...(topic._updatedAt ? { lastmod: new Date(topic._updatedAt).toISOString().slice(0, 10) } : {}),
        changefreq,
        priority,
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
