import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { BLOG_GLOBAL_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { submitIndexNowUrls } from "@pakfactory/sanity/indexnow";
import { stampPublishedAtIfMissing } from "@pakfactory/sanity/stamp-published-at";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "@/lib/sanity/env";
import { absoluteUrl } from "@/lib/site";
import {
  WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG,
  WWW_CATALOG_LINES_CACHE_TAG,
  WWW_CATALOG_PRODUCTS_CACHE_TAG,
  WWW_FOOTER_CACHE_TAG,
  WWW_GLOBAL_SETTINGS_CACHE_TAG,
  wwwProductTag,
} from "@/lib/www-cache";

const INDEXNOW_HOST = "pakfactory.com";

/**
 * Sanity webhook → on-demand revalidation for apps/www.
 *
 * Configure a webhook targeting this route (`/api/revalidate` on the www
 * origin, e.g. `https://pakfactory-com-www.vercel.app/api/revalidate?secret=<secret>`)
 * with the shared secret sent as `Authorization: Bearer <secret>` or `?secret=<secret>`,
 * filtered to types that case studies or the catalog render:
 *
 *   _type in [
 *     "caseStudy", "listingPage", "client",
 *     "solution", "productLine", "expertiseStage", "customizationOption",
 *     "product", "productStyle", "customizationCategory", "customizationType",
 *     "blogNavigation", "settings"
 *   ]
 *
 * Case studies: the listing always revalidates. A slugged `caseStudy` edit
 * revalidates that detail page; anything else in the case-study set sweeps
 * every detail page.
 *
 * Catalog: matching cache tags are busted (`revalidateTag`) and product /
 * customization paths are refreshed. `revalidatePath` alone does not invalidate
 * `unstable_cache` tags.
 *
 * A slugged `caseStudy` publish/update/unpublish (PROD-2172) also pings IndexNow
 * with that study's canonical URL.
 *
 * PROD-2228: caseStudy publish without publishedAt stamps Publish date before
 * path revalidation. Projection must include `_id`, `_type`, `slug { current }`
 * (and optionally `publishedAt`).
 */
const CASE_STUDY_TYPES = new Set([
  "caseStudy",
  "listingPage",
  "client",
  "solution",
  "productLine",
  "expertiseStage",
  "customizationOption",
]);

const CATALOG_PRODUCT_TYPES = new Set([
  "product",
  "productLine",
  "productStyle",
]);

const CATALOG_CUSTOMIZATION_TYPES = new Set([
  "customizationOption",
  "customizationCategory",
  "customizationType",
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
  let documentId: string | undefined;
  let publishedAtFromPayload: string | null | undefined;
  try {
    const body = (await request.json()) as {
      _id?: string;
      _type?: string;
      publishedAt?: string | null;
      slug?: { current?: string };
    };
    type = typeof body?._type === "string" ? body._type : undefined;
    slug = body?.slug?.current;
    documentId = typeof body?._id === "string" ? body._id : undefined;
    publishedAtFromPayload = body?.publishedAt;
  } catch {
    // no body — sweep everything below
  }

  // PROD-2228 — stamp before path bust so the first rebuild can see publishedAt.
  let publishedAtStamp: Awaited<
    ReturnType<typeof stampPublishedAtIfMissing>
  > | null = null;
  if (type === "caseStudy" && documentId) {
    publishedAtStamp = await stampPublishedAtIfMissing({
      documentId,
      documentType: type,
      publishedAtFromPayload,
      projectId: getSanityProjectId(),
      dataset: getSanityDataset(),
      apiVersion: getSanityApiVersion(),
    });
  }

  const revalidated: string[] = [];
  const tags = new Set<string>();

  const touchesCaseStudies = !type || CASE_STUDY_TYPES.has(type);
  if (touchesCaseStudies) {
    // The listing always reflects any of these changes (cards, filters, page SEO).
    revalidatePath("/case-studies");
    revalidated.push("/case-studies");

    if (type === "caseStudy" && slug) {
      revalidatePath(`/case-studies/${slug}`);
      revalidated.push(`/case-studies/${slug}`);
    } else if (touchesCaseStudies) {
      revalidatePath("/case-studies/[slug]", "page");
      revalidated.push("/case-studies/[slug]");
    }
  }

  const touchesProducts =
    !type || CATALOG_PRODUCT_TYPES.has(type) || type === "customizationOption";
  if (touchesProducts) {
    tags.add(WWW_CATALOG_PRODUCTS_CACHE_TAG);
    tags.add(WWW_CATALOG_LINES_CACHE_TAG);
    revalidatePath("/products");
    revalidated.push("/products");
    if (type === "product" && slug) {
      tags.add(wwwProductTag(slug));
      revalidatePath(`/products/${slug}`);
      revalidated.push(`/products/${slug}`);
    } else {
      revalidatePath("/products/[slug]", "page");
      revalidatePath("/products/[slug]/[styleSlug]", "page");
      revalidated.push("/products/[slug]", "/products/[slug]/[styleSlug]");
    }
  }

  const touchesCustomizations =
    !type || CATALOG_CUSTOMIZATION_TYPES.has(type);
  if (touchesCustomizations) {
    tags.add(WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG);
    // Product PDP embeds available customizations.
    tags.add(WWW_CATALOG_PRODUCTS_CACHE_TAG);
    tags.add(WWW_CATALOG_LINES_CACHE_TAG);
    revalidatePath("/customizations");
    revalidated.push("/customizations");
    revalidatePath("/customizations/[category]", "page");
    revalidatePath("/customizations/[category]/[handle]", "page");
    revalidated.push(
      "/customizations/[category]",
      "/customizations/[category]/[handle]",
    );
  }

  if (!type || type === "blogNavigation") {
    tags.add(WWW_FOOTER_CACHE_TAG);
  }

  if (!type || type === "settings") {
    tags.add(WWW_GLOBAL_SETTINGS_CACHE_TAG);
  }

  // Next 16: revalidateTag takes (tag, profile). "max" requests a full revalidate.
  for (const tag of tags) revalidateTag(tag, "max");

  // PROD-2172 — ping IndexNow on case-study publish/update/unpublish. Covers
  // unpublish too: Sanity's delete webhook payload still carries the doc's last
  // `slug`, which this route already parses above.
  // indexNowSkipped surfaces *why* nothing was submitted directly in the webhook
  // Attempts log response, so debugging never needs Vercel function log access.
  let indexNowSubmitted: string[] = [];
  let indexNowSkipped: string | undefined;
  if (type === "caseStudy") {
    if (!slug) {
      indexNowSkipped = "no-slug: webhook payload had no slug.current";
    } else if (!isSanityConfigured()) {
      indexNowSkipped = "sanity-not-configured";
    } else {
      try {
        const settings = await getPublishedSanityClient().fetch<{
          indexNowKey?: string | null;
        } | null>(BLOG_GLOBAL_SETTINGS_QUERY);
        const key = settings?.indexNowKey?.trim();
        if (!key) {
          indexNowSkipped = "no-key: Global Settings indexNowKey is empty";
        } else {
          const result = await submitIndexNowUrls({
            host: INDEXNOW_HOST,
            key,
            keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`,
            urls: [absoluteUrl(`/case-studies/${slug}`)],
          });
          indexNowSubmitted = result.submitted;
          if (result.submitted.length === 0) {
            indexNowSkipped =
              "submit-filtered: normalized URL didn't match host, or the request failed";
          }
        }
      } catch (err) {
        // Never let an IndexNow failure affect the revalidation response.
        indexNowSkipped = `error: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[revalidate] indexnow submit error", err);
      }
    }
  }

  const tracked =
    !type ||
    CASE_STUDY_TYPES.has(type) ||
    CATALOG_PRODUCT_TYPES.has(type) ||
    CATALOG_CUSTOMIZATION_TYPES.has(type) ||
    type === "blogNavigation" ||
    type === "settings";

  return NextResponse.json({
    revalidated: true,
    type: type ?? "unknown",
    slug: slug ?? null,
    tracked,
    paths: revalidated,
    tags: [...tags],
    indexNowSubmitted,
    ...(indexNowSkipped ? { indexNowSkipped } : {}),
    ...(publishedAtStamp ? { publishedAtStamp } : {}),
  });
}
