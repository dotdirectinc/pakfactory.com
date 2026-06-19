import type { MetadataRoute } from "next";
import {
  AUTHORS_FOR_SITEMAP_QUERY,
  BLOG_LANDING_PAGES_SITEMAP_QUERY,
  BLOG_SITEMAP_POSTS_QUERY,
} from "@pakfactory/sanity/queries";
import { blogPageDetailHref } from "@/lib/blog-page";
import { fetchBlogCategories } from "@/lib/blog-data";
import { fetchBlogSettings } from "@/lib/blog-settings";
import { authorHref, categoryHref, postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";

export const revalidate = 60;

type SitemapPost = {
  slug: string;
  categorySlug?: string;
  publishedAt?: string;
  _updatedAt?: string;
};

type Changefreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

function toChangefreq(value?: string | null): Changefreq | undefined {
  const allowed: Changefreq[] = [
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never",
  ];
  return allowed.includes(value as Changefreq)
    ? (value as Changefreq)
    : undefined;
}

/**
 * XML sitemap for indexable blog routes (PROD-1596). All URLs flow through
 * `absoluteUrl()`, so when the blog moves to `pakfactory.com/blog` (basePath
 * `/blog`) this file is served at `/blog/sitemap.xml` and every entry gains the
 * `/blog` prefix automatically. Paginated (page ≥ 2) and filtered listings are
 * `noindex` and intentionally excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogSettings = await fetchBlogSettings();
  const postSitemap = blogSettings?.postDefaults;
  const categorySitemap = blogSettings?.categoryDefaults;
  const authorSitemap = blogSettings?.authorDefaults;

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl("/all"),
      changeFrequency: toChangefreq(postSitemap?.sitemapChangefreq) ?? "daily",
      priority: postSitemap?.sitemapPriority ?? 0.8,
    },
  ];

  const categories = await fetchBlogCategories();
  for (const category of categories) {
    entries.push({
      url: absoluteUrl(categoryHref(category.slug)),
      changeFrequency:
        toChangefreq(categorySitemap?.sitemapChangefreq) ?? "weekly",
      priority: categorySitemap?.sitemapPriority ?? 0.7,
    });
  }

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const posts = await client
      .fetch<SitemapPost[]>(BLOG_SITEMAP_POSTS_QUERY, blogLanguageParams())
      .catch(() => [] as SitemapPost[]);

    for (const post of posts) {
      const lastmod = post._updatedAt ?? post.publishedAt;
      entries.push({
        url: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
        ...(lastmod ? { lastModified: new Date(lastmod) } : {}),
        changeFrequency:
          toChangefreq(postSitemap?.sitemapChangefreq) ?? "weekly",
        priority: postSitemap?.sitemapPriority ?? 0.7,
      });
    }

    const authors = await client
      .fetch<{ slug: string; _updatedAt?: string }[]>(
        AUTHORS_FOR_SITEMAP_QUERY,
        blogLanguageParams(),
      )
      .catch(() => [] as { slug: string; _updatedAt?: string }[]);

    for (const author of authors) {
      entries.push({
        url: absoluteUrl(authorHref(author.slug)),
        ...(author._updatedAt ? { lastModified: new Date(author._updatedAt) } : {}),
        changeFrequency:
          toChangefreq(authorSitemap?.sitemapChangefreq) ?? "monthly",
        priority: authorSitemap?.sitemapPriority ?? 0.3,
      });
    }

    const landingPages = await client
      .fetch<
        { slug: string; publishedAt?: string; _updatedAt?: string }[]
      >(BLOG_LANDING_PAGES_SITEMAP_QUERY, blogLanguageParams())
      .catch(() => [] as { slug: string; publishedAt?: string; _updatedAt?: string }[]);

    for (const page of landingPages) {
      const lastmod = page._updatedAt ?? page.publishedAt;
      entries.push({
        url: absoluteUrl(blogPageDetailHref(page.slug)),
        ...(lastmod ? { lastModified: new Date(lastmod) } : {}),
        changeFrequency:
          toChangefreq(postSitemap?.sitemapChangefreq) ?? "monthly",
        priority: (postSitemap?.sitemapPriority ?? 0.7) * 0.7,
      });
    }
  }

  return entries;
}
