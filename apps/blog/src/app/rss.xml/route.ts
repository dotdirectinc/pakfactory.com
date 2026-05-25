import { BLOG_RSS_POSTS_QUERY } from "@pakfactory/sanity/queries";
import { BLOG_REVALIDATE_SECONDS } from "@/lib/blog-cache";
import { buildRssFeedXml, type RssPostItem } from "@/lib/rss";
import { getSiteUrl } from "@/lib/site";
import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";

export const revalidate = BLOG_REVALIDATE_SECONDS;

async function fetchRssPosts(): Promise<RssPostItem[]> {
  if (!isSanityConfigured()) return [];
  return getSanityClient()
    .fetch<RssPostItem[]>(BLOG_RSS_POSTS_QUERY)
    .catch(() => []);
}

export async function GET() {
  const posts = await fetchRssPosts();
  const xml = buildRssFeedXml(getSiteUrl(), posts);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${BLOG_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
