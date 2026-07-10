import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Sanity webhook → on-demand revalidation for apps/www.
 *
 * Configure a Sanity webhook targeting this route filtered to
 * `_type == "caseStudy" || _type == "caseStudiesPage"`,
 * with the shared secret sent as `Authorization: Bearer <secret>`.
 *
 * On any caseStudy publish/unpublish/delete, revalidates the listing and
 * all detail pages immediately without waiting for the revalidate TTL.
 */
export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ message: "Revalidation not configured." }, { status: 503 });
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
    const body = (await request.json()) as { _type?: string; slug?: { current?: string } };
    type = typeof body?._type === "string" ? body._type : undefined;
    slug = body?.slug?.current;
  } catch {
    // no body — revalidate everything
  }

  // Always revalidate the listing page
  revalidatePath("/case-studies");

  // Revalidate the specific detail page if slug is known; otherwise sweep all
  if (slug) {
    revalidatePath(`/case-studies/${slug}`);
  } else if (!type || type === "caseStudy") {
    revalidatePath("/case-studies/[slug]", "page");
  }

  return NextResponse.json({
    revalidated: true,
    type: type ?? "unknown",
    slug: slug ?? null,
  });
}
