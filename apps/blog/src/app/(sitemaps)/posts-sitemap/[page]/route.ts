import { BLOG_SITEMAP_POSTS_PAGE_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, SITEMAP_GROUP_SIZE, xmlResponse, type SitemapUrlEntry } from "@pakfactory/sitemap";

export const revalidate = 60;

type SitemapPost = {
  slug: string;
  categorySlug?: string;
  mainImageUrl?: string;
  publishedAt?: string;
  _updatedAt?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: pageStr } = await params;
  // Canonical form is `/posts-sitemap/{n}.xml`; the bare `/posts-sitemap/{n}`
  // (no extension) is still accepted so previously-submitted URLs don't 404.
  const digits = /^(\d+)(?:\.xml)?$/.exec(pageStr)?.[1];
  const page = digits ? parseInt(digits, 10) : NaN;
  if (isNaN(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  const blogSettings = await fetchBlogSettings();
  const postSitemap = blogSettings?.postDefaults;
  const changefreq = postSitemap?.sitemapChangefreq ?? "weekly";
  const priority = postSitemap?.sitemapPriority ?? 0.7;

  // Only individual post URLs live here; `/all` (the posts archive index) is a
  // listing page and belongs in pages-sitemap.xml with `/` and `/contribute`.
  const entries: SitemapUrlEntry[] = [];

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
        ...(post.mainImageUrl ? { images: [post.mainImageUrl] } : {}),
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
