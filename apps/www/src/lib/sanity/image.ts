import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import type { ImageLoader } from "next/image";
import { getSanityDataset, getSanityProjectId } from "./env";

const DEFAULT_LOADER_QUALITY = 80;

export function urlFor(source: SanityImageSource) {
  const projectId = getSanityProjectId();
  if (!projectId) {
    throw new Error(
      "Sanity project id missing. Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local.",
    );
  }
  return createImageUrlBuilder({ projectId, dataset: getSanityDataset() }).image(source);
}

/**
 * Full-resolution Sanity CDN URL (no fixed width). Pass to `next/image` with
 * {@link sanityImageLoader} so each srcset candidate requests the right size.
 */
export function sanityImageBaseUrl(source: unknown): string | undefined {
  if (source != null && typeof source === "object") {
    const directUrl = (source as { url?: unknown }).url;
    if (typeof directUrl === "string" && directUrl.trim() !== "") {
      return stripSizeParams(directUrl.trim());
    }
  }
  if (source == null || typeof source !== "object") return undefined;
  const projectId = getSanityProjectId();
  if (!projectId) return undefined;
  try {
    return createImageUrlBuilder({
      projectId,
      dataset: getSanityDataset(),
    })
      .image(source as SanityImageSource)
      .fit("max")
      .auto("format")
      .url();
  } catch {
    return undefined;
  }
}

/**
 * Custom `next/image` loader: asks Sanity CDN for `width` / `quality` instead
 * of going through Next's optimizer (avoids upscaling a pre-shrunk URL).
 */
export const sanityImageLoader: ImageLoader = ({ src, width, quality }) => {
  try {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? DEFAULT_LOADER_QUALITY));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  } catch {
    return src;
  }
};

/**
 * Square-crop loader for `aspect-square` thumbnails: asks Sanity for a `width` ×
 * `width` centre crop (`fit=crop`) so the fetched image already fills the square.
 * The default `fit=max` loader preserves the source aspect ratio, so a landscape
 * image is too short for a square container and `object-cover` upscales it (blur).
 */
export const sanitySquareImageLoader: ImageLoader = ({ src, width, quality }) => {
  try {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("h", String(width));
    url.searchParams.set("q", String(quality ?? DEFAULT_LOADER_QUALITY));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    return url.toString();
  } catch {
    return src;
  }
};

/** True when `src` is a Sanity CDN URL we can resize via {@link sanityImageLoader}. */
export function isSanityCdnUrl(src: string): boolean {
  try {
    return new URL(src).hostname === "cdn.sanity.io";
  } catch {
    return false;
  }
}

/**
 * Resolved alt text for a Sanity image field. GROQ projects `alt` as a
 * coalesce of the per-use override and the asset-level `altText` set in the
 * Media library; this reads it safely and treats blank as absent.
 */
export function sanityImageAlt(source: unknown): string | undefined {
  if (source == null || typeof source !== "object") return undefined;
  const alt = (source as { alt?: unknown }).alt;
  return typeof alt === "string" && alt.trim() !== "" ? alt.trim() : undefined;
}

/**
 * Content image alt cascade: GROQ-coalesced per-use/asset alt (tiers 1–2),
 * then optional title fallback (tier 3).
 */
export function resolveImageAlt(
  source: unknown,
  titleFallback?: string,
): string {
  return sanityImageAlt(source) ?? titleFallback?.trim() ?? "";
}

function stripSizeParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("w");
    parsed.searchParams.delete("h");
    parsed.searchParams.delete("q");
    return parsed.toString();
  } catch {
    return url;
  }
}
