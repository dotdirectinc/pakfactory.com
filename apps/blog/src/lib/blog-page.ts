import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderSection } from "@/components/sections/registry";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
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
  ogImageUrl?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
  pageBuilder?: PageBuilderSection[] | null;
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
      blogLanguageParams({ slug }),
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
  const settings = await fetchBlogGlobalSettings();

  return buildDocMetadata({
    title: page.title,
    descriptionFallback: `Read ${page.title} on PakFactory Blog.`,
    featuredImageUrl: page.ogImageUrl,
    selfCanonicalPath: `/${page.slug}`,
    defaultOgImageUrl: settings?.defaultOgImageUrl,
    seo: page,
  });
}

export function blogPageDetailHref(slug: string): string {
  return `/${slug}`;
}
