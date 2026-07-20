import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Sanity webhook → on-demand revalidation for apps/www (case studies).
 *
 * Configure a Sanity webhook targeting this route (`/api/revalidate` on the www
 * origin, e.g. `https://pakfactory-com-www.vercel.app/api/revalidate?secret=<secret>`)
 * with the shared secret sent as `Authorization: Bearer <secret>` or `?secret=<secret>`,
 * filtered to every type a case-studies page renders:
 *
 *   _type in [
 *     "caseStudy", "caseStudiesPage", "client",
 *     "solution", "productCategory", "expertiseStage", "capability"
 *   ]
 *
 * `caseStudy` = the studies; `caseStudiesPage` = listing SEO/hero + per-detail CTA;
 * `client` = card/detail client name+logo+industry; the four taxonomies =
 * products / expertise / customization / industry chips shown on cards + detail.
 *
 * Behaviour: the listing always revalidates. A slugged `caseStudy` edit revalidates
 * just that detail page; anything else (page settings, client, taxonomy, a slugless
 * caseStudy, or no body) sweeps every detail page — any of them could reference the
 * changed doc, and we can't know which without a query.
 */
const CASE_STUDY_TYPES = new Set([
  "caseStudy",
  "caseStudiesPage",
  "client",
  "solution",
  "productCategory",
  "expertiseStage",
  "capability",
]);

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
    // no body — sweep everything below
  }

  const revalidated: string[] = [];

  // The listing always reflects any of these changes (cards, filters, page SEO).
  revalidatePath("/case-studies");
  revalidated.push("/case-studies");

  if (type === "caseStudy" && slug) {
    // A specific study changed → only its own detail page needs a targeted refresh.
    revalidatePath(`/case-studies/${slug}`);
    revalidated.push(`/case-studies/${slug}`);
  } else {
    // Page settings, a referenced client/taxonomy, a slugless caseStudy, or an
    // unknown/empty payload → any detail page could be affected. Sweep them all.
    revalidatePath("/case-studies/[slug]", "page");
    revalidated.push("/case-studies/[slug]");
  }

  return NextResponse.json({
    revalidated: true,
    type: type ?? "unknown",
    slug: slug ?? null,
    tracked: CASE_STUDY_TYPES.has(type ?? "") || !type,
    paths: revalidated,
  });
}
