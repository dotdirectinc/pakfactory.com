import { postDetailHref } from "@/lib/blog-post-url";
import { normalizeSiteUrl } from "@/lib/site";

export type RssPostItem = {
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  categorySlug?: string;
  categoryTitle?: string;
  authorName?: string;
};

const RSS_CHANNEL_TITLE = "PakFactory Blog";
const RSS_CHANNEL_DESCRIPTION =
  "Packaging insights, trends, and industry news from PakFactory.";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function formatRssPubDate(iso?: string): string {
  if (!iso) return new Date().toUTCString();
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function buildItemXml(siteUrl: string, post: RssPostItem): string {
  const link = `${siteUrl}${postDetailHref(post.slug, post.categorySlug)}`;
  const title = escapeXml(post.title);
  const description = post.excerpt?.trim()
    ? `<description>${cdata(post.excerpt.trim())}</description>`
    : "";
  const pubDate = formatRssPubDate(post.publishedAt);
  const category = post.categoryTitle?.trim()
    ? `<category>${escapeXml(post.categoryTitle.trim())}</category>`
    : "";
  const author = post.authorName?.trim()
    ? `<dc:creator>${escapeXml(post.authorName.trim())}</dc:creator>`
    : "";

  return `<item>
  <title>${title}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(link)}</guid>
  ${description}
  <pubDate>${pubDate}</pubDate>
  ${category}
  ${author}
</item>`;
}

export function buildRssFeedXml(siteUrl: string, posts: RssPostItem[]): string {
  const origin = normalizeSiteUrl(siteUrl);
  const lastBuildDate =
    posts.length > 0
      ? formatRssPubDate(posts[0]?.publishedAt)
      : new Date().toUTCString();
  const items = posts.map((post) => buildItemXml(origin, post)).join("\n");

  const selfUrl = `${origin}/rss.xml`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(RSS_CHANNEL_TITLE)}</title>
    <link>${escapeXml(origin)}</link>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(RSS_CHANNEL_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
${items}
  </channel>
</rss>`;
}
