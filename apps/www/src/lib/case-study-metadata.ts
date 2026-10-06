import type { Metadata } from "next";
import type { CaseStudyDetail } from "@pakfactory/sanity/queries";
import { fetchWwwGlobalSettings } from "@/lib/www-global-settings";

/** Recommended Open Graph image size (Studio Social fields target 1200×630). */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const OG_SITE_NAME = "PakFactory";

/** Pick first non-empty absolute image URL from a fallback chain. */
export function firstOgImageUrl(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/**
 * Case study detail image chain (PROD-2175):
 * ogImage → cardImage → hero image → video thumb → settings.defaultOgImage.
 */
export function resolveCaseStudyOgImageUrl(
  study: Pick<
    CaseStudyDetail,
    "ogImageUrl" | "cardImageUrl" | "heroMedia"
  >,
  defaultOgImageUrl?: string | null,
): string | undefined {
  return firstOgImageUrl(
    study.ogImageUrl,
    study.cardImageUrl,
    study.heroMedia?.imageUrl,
    study.heroMedia?.videoThumbnailUrl,
    defaultOgImageUrl,
  );
}

/** Listing image chain: page ogImage → settings.defaultOgImage. */
export function resolveCaseStudiesListingOgImageUrl(
  pageOgImageUrl?: string | null,
  defaultOgImageUrl?: string | null,
): string | undefined {
  return firstOgImageUrl(pageOgImageUrl, defaultOgImageUrl);
}

/**
 * Global Settings `defaultOgImage` for www OG fallbacks. Reads the cached
 * Global Settings entry the root layout already loads (PROD-2755).
 */
export async function fetchDefaultOgImageUrl(): Promise<string | null> {
  const settings = await fetchWwwGlobalSettings();
  return settings?.defaultOgImageUrl?.trim() || null;
}

/** Shared Open Graph + Twitter shape for case-study templates. */
export function buildSocialMetadata(input: {
  title: string;
  description?: string;
  canonical: string;
  openGraphType: "article" | "website";
  ogImageUrl?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { title, description, canonical, openGraphType, ogImageUrl } = input;

  return {
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: canonical,
      siteName: OG_SITE_NAME,
      type: openGraphType,
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: OG_IMAGE_WIDTH,
                height: OG_IMAGE_HEIGHT,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}
