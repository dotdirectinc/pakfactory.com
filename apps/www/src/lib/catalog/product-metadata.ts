import type { Metadata } from "next";

import { buildSocialMetadata, firstOgImageUrl } from "@/lib/social-metadata";
import type { Product, ProductLine } from "@/lib/catalog/types";
import { absoluteUrl } from "@/lib/site";
import { productHref, WWW_ROUTES } from "@/lib/www-routes";

/**
 * Share-card image for a product page.
 *
 * 🔴 The first `media` frame is deliberately the same image `product-jsonld.ts`
 * puts first in `Product.image`. The share card and the structured data are two
 * claims about the same page, and they must not be able to disagree about what
 * it is a picture of.
 *
 * Falls back to Global Settings `defaultOgImage` — a product with no media is a
 * content gap, and a branded card beats the platform's blank rectangle.
 */
export function resolveProductOgImageUrl(
  product: Pick<Product, "media">,
  defaultOgImageUrl?: string | null,
): string | undefined {
  const firstFrame = product.media.find((slide) => slide.src?.trim());
  return firstOgImageUrl(firstFrame?.src, defaultOgImageUrl);
}

/** Share-card image for a product line landing page. */
export function resolveProductLineOgImageUrl(
  line: Pick<ProductLine, "imageUrl">,
  defaultOgImageUrl?: string | null,
): string | undefined {
  return firstOgImageUrl(line.imageUrl, defaultOgImageUrl);
}

/**
 * Open Graph and Twitter metadata for the two pages `/products/[slug]` serves.
 *
 * Until now this route returned a title and description and nothing else, so a
 * product link pasted into Slack, LinkedIn or a message showed no picture at
 * all — on the page type whose whole job is to show the product.
 *
 * ℹ️ Social platforms read these meta tags, never our JSON-LD. The two carry
 * the same image on purpose, but they are separate mechanisms.
 */
export function buildProductSocialMetadata(input: {
  title: string;
  description?: string;
  canonicalPath: string;
  ogImageUrl?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return buildSocialMetadata({
    title: input.title,
    description: input.description,
    canonical: absoluteUrl(input.canonicalPath),
    openGraphType: "website",
    ogImageUrl: input.ogImageUrl,
  });
}

/** Canonical path for a product detail page. */
export function productCanonicalPath(product: Pick<Product, "slug">): string {
  return productHref(product.slug);
}

/** Canonical path for a product line landing page. */
export function productLineCanonicalPath(
  line: Pick<ProductLine, "slug">,
): string {
  return `${WWW_ROUTES.products}/${line.slug}`;
}
