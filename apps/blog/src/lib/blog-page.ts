import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { absoluteUrl } from "@/lib/site";
import { BLOG_PAGE_BY_SLUG_QUERY } from "@pakfactory/sanity/queries";

export type BlogPageRecord = {
  _id: string;
  title: string;
  pageRole: "landing" | "static";
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean | null;
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
    return await getSanityClient().fetch<BlogPageRecord | null>(
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

export function buildBlogPageMetadata(page: BlogPageRecord): Metadata {
  const title =
    page.metaTitle?.trim() || `${page.title} | PakFactory Blog`;
  const description =
    page.metaDescription?.trim() ||
    `Read ${page.title} on PakFactory Blog.`;
  const canonical = absoluteUrl(`/${page.slug}`);

  return {
    title,
    description,
    robots: page.noindex ? { index: false, follow: true } : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(page.ogImageUrl ? { images: [{ url: page.ogImageUrl }] } : {}),
    },
    twitter: {
      card: page.ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(page.ogImageUrl ? { images: [page.ogImageUrl] } : {}),
    },
  };
}

export function blogPageDetailHref(slug: string): string {
  return `/${slug}`;
}
