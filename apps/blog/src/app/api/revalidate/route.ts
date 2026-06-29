import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  BLOG_POSTS_CACHE_TAG,
  BLOG_REDIRECTS_CACHE_TAG,
  BLOG_SETTINGS_CACHE_TAG,
} from "@/lib/blog-cache";

/**
 * Sanity webhook → on-demand revalidation.
 *
 * Configure a webhook in Sanity (project 8293wrxp) targeting this route,
 * filtered to `_type == "redirect" || _type == "post" || _type == "blogSettings" || _type == "blogNavigation" || _type == "blogCategory"`, with a shared secret
 * sent as `Authorization: Bearer <secret>` or `?secret=<secret>`.
 *
 * - redirect CRUD or post publish → refresh the cached redirect map.
 * - post publish → also refresh post-derived surfaces (home/RSS/listings).
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
  try {
    const body = (await request.json()) as { _type?: string };
    type = typeof body?._type === "string" ? body._type : undefined;
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
  if (type === "blogSettings" || type === "blogNavigation" || type === "blogCategory" || !type) {
    tags.add(BLOG_SETTINGS_CACHE_TAG);
  }
  // Next 16: revalidateTag takes (tag, profile). "max" requests a full revalidate;
  // the underlying unstable_cache TTL (BLOG_REVALIDATE_SECONDS) is the freshness floor.
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({
    revalidated: true,
    type: type ?? "all",
    tags: [...tags],
  });
}
