import type { CaseStudyDetail } from "@pakfactory/sanity/queries";
import { fetchWwwGlobalSettings } from "@/lib/www-global-settings";

/**
 * Case-study and www metadata helpers that need Sanity.
 *
 * The pure card-shaping half lives in `social-metadata.ts` and is re-exported
 * here, so every existing import of this module keeps working.
 */
export {
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_SITE_NAME,
  firstOgImageUrl,
  buildSocialMetadata,
} from "@/lib/social-metadata";
import { firstOgImageUrl } from "@/lib/social-metadata";

/**
 * Case study detail image chain (PROD-2175):
 * ogImage → cardImage → hero image → video thumb → settings.defaultOgImage.
 */
export function resolveCaseStudyOgImageUrl(
  study: Pick<CaseStudyDetail, "ogImageUrl" | "cardImageUrl" | "heroMedia">,
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
