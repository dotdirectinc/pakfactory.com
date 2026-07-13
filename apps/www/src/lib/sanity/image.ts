import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { getSanityDataset, getSanityProjectId } from "./env";

export function urlFor(source: SanityImageSource) {
  const projectId = getSanityProjectId();
  if (!projectId) {
    throw new Error(
      "Sanity project id missing. Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local.",
    );
  }
  return createImageUrlBuilder({ projectId, dataset: getSanityDataset() }).image(source);
}
