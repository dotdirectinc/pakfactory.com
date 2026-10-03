import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import type { ImageLoader } from "next/image";
import { getSanityDataset, getSanityProjectId } from "./env";

const DEFAULT_LOADER_QUALITY = 80;

/** Reference width used to bake hotspot/crop `rect` into a loader base URL. */
const CROP_BASE_REF_WIDTH = 2000;

export type SanityImageCropAspect = "square" | "portrait";

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
  if (typeof source === "string" && source.trim() !== "") {
    return stripSizeParams(source.trim());
  }
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
 * Hotspot/crop-aware base CDN URL for square or 3:4 portrait frames.
 * Bakes Studio focal point into `rect` (via `@sanity/image-url`), then strips
 * `w`/`h`/`q` so {@link sanitySquareImageLoader} / {@link sanityPortraitImageLoader}
 * can size each srcset candidate. Bare URL strings fall back to centre crop.
 */
export function sanityImageCropBaseUrl(
  source: unknown,
  aspect: SanityImageCropAspect,
): string | undefined {
  if (typeof source === "string" && source.trim() !== "") {
    return stripSizeParams(source.trim());
  }
  if (source != null && typeof source === "object") {
    const directUrl = (source as { url?: unknown }).url;
    const hasAsset =
      (source as { asset?: unknown }).asset != null ||
      typeof (source as { _ref?: unknown })._ref === "string";
    // Pre-resolved asset URL with no hotspot object — loader will centre-crop.
    if (
      typeof directUrl === "string" &&
      directUrl.trim() !== "" &&
      !hasAsset
    ) {
      return stripSizeParams(directUrl.trim());
    }
  }
  if (source == null || typeof source !== "object") return undefined;
  const projectId = getSanityProjectId();
  if (!projectId) return undefined;

  const width = CROP_BASE_REF_WIDTH;
  const height =
    aspect === "square" ? width : Math.round(width * (4 / 3));

  try {
    const built = createImageUrlBuilder({
      projectId,
      dataset: getSanityDataset(),
    })
      .image(source as SanityImageSource)
      .width(width)
      .height(height)
      .fit("crop")
      .auto("format")
      .url();
    return stripSizeParams(built);
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

/**
 * Portrait 3:4 crop loader for Industry LP hero tiles: asks Sanity for a
 * `width` × `round(width * 4/3)` centre crop (`fit=crop`) so the fetched image
 * already fills the portrait card. Same blur failure mode as the square loader
 * when landscape sources are width-resized then CSS `object-cover`’d taller.
 */
export const sanityPortraitImageLoader: ImageLoader = ({
  src,
  width,
  quality,
}) => {
  try {
    const url = new URL(src);
    const height = Math.round(width * (4 / 3));
    url.searchParams.set("w", String(width));
    url.searchParams.set("h", String(height));
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
