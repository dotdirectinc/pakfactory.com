import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import type { ImageLoader } from "next/image";
import { getSanityDataset, getSanityProjectId } from "@/lib/sanity/env";

const DEFAULT_LOADER_QUALITY = 80;

/**
 * Absolute CDN URL for a Sanity image field at a fixed width, or undefined if
 * unbuildable. Prefer {@link sanityImageBaseUrl} + {@link sanityImageLoader}
 * for `next/image` display; keep this for OG / JSON-LD / non-responsive uses.
 */
export function sanityImageUrl(source: unknown, width = 1200): string | undefined {
  if (source != null && typeof source === "object") {
    const directUrl = (source as { url?: unknown }).url;
    if (typeof directUrl === "string" && directUrl.trim() !== "") {
      return directUrl;
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
      .width(width)
      .fit("max")
      .auto("format")
      .url();
  } catch {
    return undefined;
  }
}

/**
 * Open Graph image URL — a **hotspot-aware 1200×630 crop** so the delivered image
 * matches the declared `og:image:width`/`height` (`OG_IMAGE_WIDTH`/`HEIGHT` = 1200×630
 * in resolve-seo). Social platforms trust the declared dimensions, so a mismatch
 * (letterbox/crop) results. `sanityImageUrl` uses `fit=max` (aspect-preserving), which
 * delivers e.g. 1200×675 for a 16:9 source — hence this dedicated OG variant that
 * `fit=crop`s to exactly 1200×630, using the image's crop/hotspot to keep the subject
 * centered (PROD-2231 item 7). Keep 1200×630 in sync with resolve-seo's OG constants.
 */
export function ogImageUrl(source: unknown): string | undefined {
  if (source != null && typeof source === "object") {
    const directUrl = (source as { url?: unknown }).url;
    if (typeof directUrl === "string" && directUrl.trim() !== "") {
      // Pre-resolved asset URL (no source object to hotspot-crop) — force 1200×630.
      try {
        const u = new URL(stripSizeParams(directUrl.trim()));
        u.searchParams.set("w", "1200");
        u.searchParams.set("h", "630");
        u.searchParams.set("fit", "crop");
        u.searchParams.set("auto", "format");
        return u.toString();
      } catch {
        return directUrl.trim();
      }
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
      .width(1200)
      .height(630)
      .fit("crop")
      .auto("format")
      .url();
  } catch {
    return undefined;
  }
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
 * Post content image alt cascade: GROQ-coalesced per-use/asset alt (tiers 1–2),
 * then optional article title (tier 3). Never invents generic labels.
 */
export function resolveImageAlt(
  source: unknown,
  titleFallback?: string,
): string {
  return sanityImageAlt(source) ?? titleFallback?.trim() ?? "";
}

/** Drop baked-in size params so the loader can set `w`/`q` per candidate. */
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
