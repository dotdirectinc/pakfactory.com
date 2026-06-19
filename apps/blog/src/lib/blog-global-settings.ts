import { unstable_cache } from "next/cache";
import { BLOG_GLOBAL_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

export type BlogGlobalSettings = {
  defaultOgImageUrl?: string | null;
  organizationLogoUrl?: string | null;
  siteTitle?: string | null;
};

async function loadBlogGlobalSettings(): Promise<BlogGlobalSettings | null> {
  if (!isSanityConfigured()) return null;
  try {
    return await getPublishedSanityClient().fetch<BlogGlobalSettings | null>(
      BLOG_GLOBAL_SETTINGS_QUERY,
    );
  } catch {
    return null;
  }
}

const getCachedBlogGlobalSettings = unstable_cache(
  loadBlogGlobalSettings,
  ["blog-global-settings"],
  { revalidate: 300, tags: ["blog-global-settings"] },
);

/** Global Settings singleton — default OG image and org logo for metadata / JSON-LD. */
export async function fetchBlogGlobalSettings(): Promise<BlogGlobalSettings | null> {
  return getCachedBlogGlobalSettings();
}
