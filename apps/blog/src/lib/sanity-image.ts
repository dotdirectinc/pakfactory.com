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
