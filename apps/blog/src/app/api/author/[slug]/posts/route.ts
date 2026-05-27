import { NextResponse } from "next/server";
import { fetchAuthorBySlug, fetchAuthorPostsPage } from "@/lib/blog-author";

export const revalidate = 60;

/**
 * Load More feed for author profile pages (PROD-1501).
 * `GET /api/author/{slug}/posts?offset=12` → `{ posts, hasMore }`, next 12.
 * Images are resolved server-side so the client grid stays free of `server-only`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const author = await fetchAuthorBySlug(slug);
  if (!author) {
    return NextResponse.json({ posts: [], hasMore: false }, { status: 404 });
  }

  const offsetParam = new URL(request.url).searchParams.get("offset");
  const offset = Number.parseInt(offsetParam ?? "0", 10);

  const result = await fetchAuthorPostsPage(slug, Number.isFinite(offset) ? offset : 0);
  return NextResponse.json(result);
}
