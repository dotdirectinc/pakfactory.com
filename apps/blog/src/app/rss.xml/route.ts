import { BLOG_RSS_POSTS_QUERY } from "@pakfactory/sanity/queries";
import { BLOG_RSS_REVALIDATE_SECONDS } from "@/lib/blog-cache";
import { buildRssFeedXml, type RssPostItem } from "@/lib/rss";
import { siteBaseUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";

/** Hourly. Must be a literal — keep in sync with `BLOG_RSS_REVALIDATE_SECONDS` in `@/lib/blog-cache`. */
export const revalidate = 3600;

async function fetchRssPosts(): Promise<RssPostItem[]> {
  if (!isSanityConfigured()) return [];
  return getPublishedSanityClient()
    .fetch<RssPostItem[]>(BLOG_RSS_POSTS_QUERY, blogLanguageParams())
    .catch(() => []);
}

export async function GET() {
  const posts = await fetchRssPosts();
  const xml = buildRssFeedXml(siteBaseUrl(), posts);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${BLOG_RSS_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
