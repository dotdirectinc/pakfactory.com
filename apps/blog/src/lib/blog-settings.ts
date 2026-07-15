import { unstable_cache } from "next/cache";
import { BLOG_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  BLOG_REVALIDATE_SECONDS,
  BLOG_SETTINGS_CACHE_TAG,
} from "@/lib/blog-cache";

export type BlogTypeDefaults = {
  metaTitleFormat?: string | null;
  metaDescriptionFormat?: string | null;
  allowIndex?: boolean | null;
  allowFollow?: boolean | null;
  noImageIndex?: boolean | null;
  sitemapPriority?: number | null;
  sitemapChangefreq?: string | null;
  /** Topic defaults only — force noindex when post count is below this. */
  autoNoindexThreshold?: number | null;
};

export type BlogSettings = {
  postDefaults?: BlogTypeDefaults | null;
  categoryDefaults?: BlogTypeDefaults | null;
  tagDefaults?: BlogTypeDefaults | null;
  authorDefaults?: BlogTypeDefaults | null;
};

async function loadBlogSettings(): Promise<BlogSettings | null> {
  if (!isSanityConfigured()) return null;
  try {
    return await getPublishedSanityClient().fetch<BlogSettings | null>(
      BLOG_SETTINGS_QUERY,
    );
  } catch {
    return null;
  }
}

const getCachedBlogSettings = unstable_cache(
  loadBlogSettings,
  ["blog-settings"],
  {
    revalidate: BLOG_REVALIDATE_SECONDS,
    tags: [BLOG_SETTINGS_CACHE_TAG],
  },
);

/** Blog Settings singleton — per-type SEO format strings and sitemap defaults. */
export async function fetchBlogSettings(): Promise<BlogSettings | null> {
  return getCachedBlogSettings();
}
