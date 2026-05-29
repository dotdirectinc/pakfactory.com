import "server-only";

import imageUrlBuilder from "@sanity/image-url";
import { getSanityDataset, getSanityProjectId } from "@/sanity/env";

type UrlForSource = Parameters<
  ReturnType<typeof imageUrlBuilder>["image"]
>[0];

/**
 * Absolute CDN URL for a Sanity image field, or undefined if unbuildable.
 */
export function sanityImageUrl(source: unknown, width = 1200): string | undefined {
  if (source == null || typeof source !== "object") return undefined;
  const projectId = getSanityProjectId();
  if (!projectId) return undefined;
  try {
    return imageUrlBuilder({
      projectId,
      dataset: getSanityDataset(),
    })
      .image(source as UrlForSource)
      .width(width)
      .fit("max")
      .url();
  } catch {
    return undefined;
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
