import { NextResponse } from "next/server";

import { getSearchBrowseData } from "@/lib/search/search-browse-data";
import { WWW_ROUTES } from "@/lib/www-routes";

/**
 * GET /api/search/idle — what the search dialog shows before anything is typed
 * (PROD-3110, PROD-3111): the product-lines row, quick links, and each rail
 * tab's browse picks (`lib/search/search-browse-data.ts`). Read from the cached
 * Sanity catalog, never Algolia, so opening the dialog costs no search query.
 *
 * Curated chips are fixed copy in the dialog itself.
 */

export const runtime = "nodejs";

const QUICK_LINKS = [
  { label: "Request a quote", href: WWW_ROUTES.request },
  { label: "Case studies", href: WWW_ROUTES.caseStudies },
  { label: "About PakFactory", href: WWW_ROUTES.about },
  { label: "Contact us", href: WWW_ROUTES.contact },
  { label: "Policies", href: WWW_ROUTES.policies },
] as const;

export async function GET() {
  try {
    // One small cached read with the site_search filter + projection. Not the
    // /products library: at ~3.9 MB it is over Next's 2 MB data-cache limit,
    // so every CDN miss here refetched it from Sanity.
    const { productLines, ...browse } = await getSearchBrowseData();
    return NextResponse.json(
      {
        productLines,
        quickLinks: QUICK_LINKS,
        browse,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    // sanityCache already logged it; never cache a failure.
    return NextResponse.json(
      { productLines: [], quickLinks: QUICK_LINKS },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
