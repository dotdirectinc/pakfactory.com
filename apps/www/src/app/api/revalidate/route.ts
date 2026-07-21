import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { BLOG_GLOBAL_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { submitIndexNowUrls } from "@pakfactory/sanity/indexnow";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { absoluteUrl } from "@/lib/site";

const INDEXNOW_HOST = "pakfactory.com";

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
 *
 * A slugged `caseStudy` publish/update/unpublish (PROD-2172) also pings IndexNow
 * with that study's canonical URL. Same webhook Projection requirement as the
 * existing `slug { current }` field this route already parses.
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

  // PROD-2172 — ping IndexNow on case-study publish/update/unpublish. Covers
  // unpublish too: Sanity's delete webhook payload still carries the doc's last
  // `slug`, which this route already parses above.
  let indexNowSubmitted: string[] = [];
  if (type === "caseStudy" && slug && isSanityConfigured()) {
    try {
      const settings = await getPublishedSanityClient().fetch<{
        indexNowKey?: string | null;
      } | null>(BLOG_GLOBAL_SETTINGS_QUERY);
      const key = settings?.indexNowKey?.trim();
      if (key) {
        const result = await submitIndexNowUrls({
          host: INDEXNOW_HOST,
          key,
          keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`,
          urls: [absoluteUrl(`/case-studies/${slug}`)],
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
    type: type ?? "unknown",
    slug: slug ?? null,
    tracked: CASE_STUDY_TYPES.has(type ?? "") || !type,
    paths: revalidated,
    indexNowSubmitted,
  });
}
