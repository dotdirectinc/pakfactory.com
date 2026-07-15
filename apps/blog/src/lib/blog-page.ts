import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLandingPageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
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
  if (process.env.NODE_ENV === "development") {
    noStore();
  }
  if (!isSanityConfigured()) return null;

  try {
    const client = await getSanityClient();
    return await client.fetch<BlogPageRecord | null>(
      BLOG_PAGE_BY_SLUG_QUERY,
      blogLandingPageParams(slug),
    );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[blog-page] fetch failed for /${slug}:`, err);
    }
    return null;
  }
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
