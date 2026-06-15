import { BLOG_RSS_POSTS_QUERY } from "@pakfactory/sanity/queries";
import { BLOG_REVALIDATE_SECONDS } from "@/lib/blog-cache";
import { buildRssFeedXml, type RssPostItem } from "@/lib/rss";
import { siteBaseUrl } from "@/lib/site";
import { getSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";

/** Must be a literal — see `BLOG_REVALIDATE_SECONDS` in `@/lib/blog-cache`. */
export const revalidate = 60;

async function fetchRssPosts(): Promise<RssPostItem[]> {
  if (!isSanityConfigured()) return [];
  return getSanityClient()
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
      "Cache-Control": `public, s-maxage=${BLOG_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
