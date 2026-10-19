import { NextResponse } from "next/server";

import { listLines, listProductLibrary } from "@/lib/catalog/catalog";
import { productHref, WWW_ROUTES } from "@/lib/www-routes";

/**
 * GET /api/search/idle — what the search dialog shows before anything is typed
 * (PROD-3110): the product-lines row and quick links. Read from the cached
 * Sanity catalog, never Algolia, so opening the dialog costs no search query.
 *
 * Curated chips and "Trending" are fixed copy in the dialog itself (PROD-3111).
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
    // Lines rarely have their own image; `/products` fills the gap from the
    // line's first product with media (build-product-library). Same here.
    const [lines, library] = await Promise.all([listLines(), listProductLibrary()]);
    return NextResponse.json(
      {
        productLines: lines.map((line) => {
          const fallback = library.linesBySlug[line.slug];
          return {
            title: line.shortName || line.title,
            href: productHref(line.slug),
            image: line.imageUrl || fallback?.imageUrl || null,
            imageAlt: (line.imageUrl ? line.imageAlt : fallback?.imageAlt) || line.title,
          };
        }),
        quickLinks: QUICK_LINKS,
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
