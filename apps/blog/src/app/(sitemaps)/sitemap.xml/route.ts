import {
  BLOG_SITEMAP_POST_COUNT_QUERY,
  BLOG_SITEMAP_TAG_COUNT_QUERY,
} from "@pakfactory/sanity/queries";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildSitemapIndex, SITEMAP_GROUP_SIZE, xmlResponse } from "@pakfactory/sitemap";

// Lowered from 3600 so new sub-sitemap pages surface promptly (PROD-1865).
export const revalidate = 300;

export async function GET() {
  let postPages = 1;
  let tagPages = 1;

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const params = blogLanguageParams();
    const [postCount, tagCount] = await Promise.all([
      client.fetch<number>(BLOG_SITEMAP_POST_COUNT_QUERY, params).catch(() => 0),
      client.fetch<number>(BLOG_SITEMAP_TAG_COUNT_QUERY, params).catch(() => 0),
    ]);
    postPages = Math.max(1, Math.ceil(postCount / SITEMAP_GROUP_SIZE));
    tagPages = Math.max(1, Math.ceil(tagCount / SITEMAP_GROUP_SIZE));
  }

  const xml = buildSitemapIndex(
    [
      { loc: absoluteUrl("/pages-sitemap.xml") },
      { loc: absoluteUrl("/categories-sitemap.xml") },
      { loc: absoluteUrl("/authors-sitemap.xml") },
      ...Array.from({ length: postPages }, (_, i) => ({
        loc: absoluteUrl(`/posts-sitemap-${i + 1}.xml`),
      })),
      ...Array.from({ length: tagPages }, (_, i) => ({
        loc: absoluteUrl(`/topics-sitemap-${i + 1}.xml`),
      })),
    ],
    sitemapXslUrl(),
  );

  return xmlResponse(xml, 300);
}
