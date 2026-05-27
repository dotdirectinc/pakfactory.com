import type { MetadataRoute } from "next";
import { BLOG_SITEMAP_POSTS_QUERY } from "@pakfactory/sanity/queries";
import { fetchBlogCategories } from "@/lib/blog-data";
import { categoryHref, postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";

export const revalidate = 60;

type SitemapPost = {
  slug: string;
  categorySlug?: string;
  publishedAt?: string;
  _updatedAt?: string;
};

/**
 * XML sitemap for indexable blog routes (PROD-1596). All URLs flow through
 * `absoluteUrl()`, so when the blog moves to `pakfactory.com/blog` (basePath
 * `/blog`) this file is served at `/blog/sitemap.xml` and every entry gains the
 * `/blog` prefix automatically. Paginated (page ≥ 2) and filtered listings are
 * `noindex` and intentionally excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/all"), changeFrequency: "daily", priority: 0.8 },
  ];

  const categories = await fetchBlogCategories();
  for (const category of categories) {
    entries.push({
      url: absoluteUrl(categoryHref(category.slug)),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  if (isSanityConfigured()) {
    const posts = await getSanityClient()
      .fetch<SitemapPost[]>(BLOG_SITEMAP_POSTS_QUERY)
      .catch(() => [] as SitemapPost[]);

    for (const post of posts) {
      const lastmod = post._updatedAt ?? post.publishedAt;
      entries.push({
        url: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
        ...(lastmod ? { lastModified: new Date(lastmod) } : {}),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
