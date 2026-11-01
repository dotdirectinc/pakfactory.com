import type { Metadata } from "next";

/**
 * Pure Open Graph / Twitter card helpers, shared by every www page family.
 *
 * Split out of `case-study-metadata.ts` so it can be tested: that module
 * imports `fetchWwwGlobalSettings`, which pulls in `server-only`, which a plain
 * node test runner cannot load. The social-card shape had no tests at all until
 * this split, on logic every public page depends on.
 *
 * Nothing here touches Sanity or the network. Keep it that way.
 */

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

/** Shared Open Graph + Twitter shape for every www page family. */
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
