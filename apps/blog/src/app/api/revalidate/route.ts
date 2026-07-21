import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { submitIndexNowUrls } from "@pakfactory/sanity/indexnow";
import {
  BLOG_GLOBAL_SETTINGS_CACHE_TAG,
  BLOG_POSTS_CACHE_TAG,
  BLOG_REDIRECTS_CACHE_TAG,
  BLOG_SETTINGS_CACHE_TAG,
} from "@/lib/blog-cache";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";

const INDEXNOW_HOST = "pakfactory.com";

/**
 * Sanity webhook → on-demand revalidation.
 *
 * Configure a webhook in Sanity (project 8293wrxp) targeting this route,
 * filtered to `_type == "redirect" || _type == "post" || _type == "postSettings" || _type == "categorySettings" || _type == "topicSettings" || _type == "authorSettings" || _type == "pageSettings" || _type == "blogNavigation" || _type == "blogCategory" || _type == "settings" || _type == "blogTag" || _type == "blogTopicGroup" || _type == "author"`, with a shared secret
 * sent as `Authorization: Bearer <secret>` or `?secret=<secret>`.
 *
 * - redirect CRUD or post publish → refresh the cached redirect map.
 * - post/tag/category/author publish → also refresh sitemap.
 * - post publish → also refresh post-derived surfaces (home/RSS/listings).
 * - post publish/update/unpublish (PROD-2172) → also ping IndexNow with the post's
 *   canonical URL. Requires the webhook's Projection to include `slug { current }`
 *   — without it, `slug` below is undefined and the ping is skipped.
 */
export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { message: "Revalidation is not configured." },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    new URL(request.url).searchParams.get("secret")?.trim();
  if (provided !== secret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let type: string | undefined;
  let slug: string | undefined;
  try {
    const body = (await request.json()) as {
      _type?: string;
      slug?: { current?: string };
    };
    type = typeof body?._type === "string" ? body._type : undefined;
    slug = body?.slug?.current;
  } catch {
    // No/!JSON body — fall back to revalidating everything below.
  }

  const tags = new Set<string>();
  if (type === "redirect" || type === "post" || !type) {
    tags.add(BLOG_REDIRECTS_CACHE_TAG);
  }
  if (type === "post" || !type) {
    tags.add(BLOG_POSTS_CACHE_TAG);
  }
  // Per-type default singletons (PROD-2116) feed the same BLOG_SETTINGS_QUERY cache.
  const settingsTypes = new Set([
    "postSettings",
    "categorySettings",
    "topicSettings",
    "authorSettings",
    "pageSettings",
    "blogNavigation",
    "blogCategory",
  ]);
  if (!type || settingsTypes.has(type)) {
    tags.add(BLOG_SETTINGS_CACHE_TAG);
  }
  if (type === "settings" || !type) {
    tags.add(BLOG_GLOBAL_SETTINGS_CACHE_TAG);
  }
  // Next 16: revalidateTag takes (tag, profile). "max" requests a full revalidate;
  // the underlying unstable_cache TTL (BLOG_REVALIDATE_SECONDS) is the freshness floor.
  for (const tag of tags) revalidateTag(tag, "max");

  // Sitemap index + all sub-sitemaps regenerate on any content change that affects entries.
  const sitemapTypes = ["post", "blogCategory", "blogTag", "author"];
  if (!type || sitemapTypes.includes(type)) {
    revalidatePath("/sitemap.xml");
    revalidatePath("/pages-sitemap.xml");
    revalidatePath("/categories-sitemap.xml");
    revalidatePath("/authors-sitemap.xml");
    revalidatePath("/posts-sitemap/1");
    revalidatePath("/topics-sitemap/1");
  }

  if (type === "blogPage" || type === "blogTopicGroup" || !type) {
    revalidatePath("/");
    revalidatePath("/topics");
  }

  // PROD-2172 — ping IndexNow on post publish/update/unpublish. Covers unpublish
  // too: Sanity's delete webhook payload still carries the doc's last `slug`.
  let indexNowSubmitted: string[] = [];
  if (type === "post" && slug) {
    try {
      const settings = await fetchBlogGlobalSettings();
      const key = settings?.indexNowKey?.trim();
      if (key) {
        const result = await submitIndexNowUrls({
          host: INDEXNOW_HOST,
          key,
          keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`,
          urls: [absoluteUrl(postDetailHref(slug))],
        });
        indexNowSubmitted = result.submitted;
      }
    } catch (err) {
      // Never let an IndexNow failure affect the revalidation response.
      console.error("[revalidate] indexnow submit error", err);
    }
  }

  return NextResponse.json({
    revalidated: true,
    type: type ?? "all",
    tags: [...tags],
    indexNowSubmitted,
  });
}
