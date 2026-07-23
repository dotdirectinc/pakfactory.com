import { BLOG_SITEMAP_POSTS_PAGE_QUERY } from "@pakfactory/sanity/queries";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl, sitemapXslUrl } from "@/lib/site";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { blogLanguageParams } from "@/lib/blog-language";
import { isSanityConfigured } from "@/lib/sanity/env";
import { buildUrlset, SITEMAP_GROUP_SIZE, xmlResponse, type SitemapUrlEntry } from "@pakfactory/sitemap";

export const revalidate = 60;

type SitemapPost = {
  slug: string;
  categorySlug?: string;
  mainImageUrl?: string;
  publishedAt?: string;
  /** Editorial "Last modified date" — same source as the page's JSON-LD. */
  lastModified?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: pageStr } = await params;
  // Canonical form is `/posts-sitemap/{n}.xml`; the bare `/posts-sitemap/{n}`
  // (no extension) is still accepted so previously-submitted URLs don't 404.
  const digits = /^(\d+)(?:\.xml)?$/.exec(pageStr)?.[1];
  const page = digits ? parseInt(digits, 10) : NaN;
  if (isNaN(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  // Only individual post URLs live here; `/all` (the posts archive index) is a
  // listing page and belongs in pages-sitemap.xml with `/` and `/contribute`.
  const entries: SitemapUrlEntry[] = [];

  if (isSanityConfigured()) {
    const client = getPublishedSanityClient();
    const queryParams = {
      ...blogLanguageParams(),
      start: (page - 1) * SITEMAP_GROUP_SIZE,
      end: page * SITEMAP_GROUP_SIZE,
    };

    const posts = await client
      .fetch<SitemapPost[]>(BLOG_SITEMAP_POSTS_PAGE_QUERY, queryParams)
      .catch(() => [] as SitemapPost[]);

    if (posts.length === 0 && page > 1) {
      return new Response("Not found", { status: 404 });
    }

    for (const post of posts) {
      // PROD-2194: `lastModified ?? publishedAt` — the exact expression
      // `blog-post.ts` uses for the page's JSON-LD `dateModified`, so the
      // sitemap and the page now assert the same date. The previous source,
      // Sanity's `_updatedAt`, stamped 154 of 171 posts with the content
      // migration date, which is precisely the unreliability that makes Google
      // discount `lastmod` altogether.
      const lastmod = post.lastModified ?? post.publishedAt;
      entries.push({
        loc: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
        ...(lastmod ? { lastmod: new Date(lastmod).toISOString().slice(0, 10) } : {}),
        ...(post.mainImageUrl ? { images: [post.mainImageUrl] } : {}),
      });
    }
  }

  return xmlResponse(buildUrlset(entries, sitemapXslUrl()), 60);
}
