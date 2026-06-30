import { BLOG_SITEMAP_POSTS_PAGE_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, SITEMAP_GROUP_SIZE, xmlResponse, type SitemapUrlEntry } from "@/lib/sitemap/xml";

export const revalidate = 60;

type SitemapPost = {
  slug: string;
  categorySlug?: string;
  publishedAt?: string;
  _updatedAt?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  const blogSettings = await fetchBlogSettings();
  const postSitemap = blogSettings?.postDefaults;
  const changefreq = postSitemap?.sitemapChangefreq ?? "weekly";
  const priority = postSitemap?.sitemapPriority ?? 0.7;

  const entries: SitemapUrlEntry[] = [];

  // /all is the first entry of page 1 only.
  if (page === 1) {
    entries.push({
      loc: absoluteUrl("/all"),
      changefreq,
      priority,
    });
  }

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const queryParams = {
      ...blogLanguageParams(),
      start: (page - 1) * SITEMAP_GROUP_SIZE,
      end: page * SITEMAP_GROUP_SIZE,
    };

    const posts = await client
      .fetch<SitemapPost[]>(BLOG_SITEMAP_POSTS_PAGE_QUERY, queryParams)
      .catch(() => [] as SitemapPost[]);

    if (posts.length === 0 && page > 1) {
      return new Response("Not found", { status: 404 });
    }

    for (const post of posts) {
      const lastmod = post._updatedAt ?? post.publishedAt;
      entries.push({
        loc: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
        ...(lastmod ? { lastmod: new Date(lastmod).toISOString().slice(0, 10) } : {}),
        changefreq,
        priority,
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
