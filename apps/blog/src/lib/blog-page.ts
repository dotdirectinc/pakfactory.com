import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { blogCachedFetch } from "@/lib/blog-cached-fetch";
import {
  BLOG_CATEGORY_CACHE_TAG,
  BLOG_PAGE_CACHE_TAG,
  BLOG_POSTS_CACHE_TAG,
} from "@/lib/blog-cache";
import { blogLandingPageParams } from "@/lib/blog-language";
import { fetchSeoContext, typeDefaults } from "@/lib/seo-context";
import {
  buildDocMetadata,
  type DocSeoFields,
} from "@/lib/resolve-seo";
import { BLOG_PAGE_BY_SLUG_QUERY } from "@pakfactory/sanity/queries";

export type BlogPageRecord = DocSeoFields & {
  _id: string;
  title: string;
  pageRole: "landing" | "static";
  slug: string;
  description?: string | null;
  ogImageUrl?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
  pageBuilder?: PageBuilderBlock[] | null;
};

export async function fetchBlogPageBySlug(
  slug: string,
): Promise<BlogPageRecord | null> {
  return blogCachedFetch<BlogPageRecord | null>({
    cacheKey: "blog-page-by-slug",
    query: BLOG_PAGE_BY_SLUG_QUERY,
    params: blogLandingPageParams(slug),
    // Landing/static pageBuilder can include postCategoryRow (category + posts).
    tags: [BLOG_PAGE_CACHE_TAG, BLOG_CATEGORY_CACHE_TAG, BLOG_POSTS_CACHE_TAG],
    fallback: null,
    label: `blog-page:${slug}`,
  });
}

export async function buildBlogPageMetadata(
  page: BlogPageRecord,
): Promise<Metadata> {
  const ctx = await fetchSeoContext();
  const defaults = typeDefaults(ctx, "pageDefaults");

  return buildDocMetadata({
    title: page.title,
    descriptionFallback: `Read ${page.title} on PakFactory Blog.`,
    featuredImageUrl: page.ogImageUrl,
    selfCanonicalPath: `/${page.slug}`,
    defaultOgImageUrl: ctx.defaultOgImageUrl,
    seo: page,
    metaTitleFormat: defaults?.metaTitleFormat,
    metaDescriptionFormat: defaults?.metaDescriptionFormat,
    formatTokens: {
      title: page.title,
      description: page.description,
      sitename: ctx.siteName,
    },
  });
}

export function blogPageDetailHref(slug: string): string {
  return `/${slug}`;
}
