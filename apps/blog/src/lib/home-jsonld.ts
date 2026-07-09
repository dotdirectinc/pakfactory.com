import { videoObject } from "@pakfactory/seo";
import type { PageBuilderBlock } from "@/components/blocks/registry";
import {
  displayDurationToIso8601,
  isVideoJsonLdReady,
  resolveVideoSource,
  type VideoPostInput,
} from "@/lib/resolve-video-source";
import { sanityImageUrl } from "@/lib/sanity-image";
import { siteBaseUrl } from "@/lib/site";

type FeaturedVideosBlockData = {
  _type: "featuredVideos";
  featuredVideo?: VideoPostInput | null;
  videos?: VideoPostInput[] | null;
};

function collectVideosFromBlocks(
  blocks: PageBuilderBlock[] | null | undefined,
): VideoPostInput[] {
  if (!blocks?.length) return [];

  const seen = new Set<string>();
  const collected: VideoPostInput[] = [];

  for (const block of blocks) {
    if (block._type !== "featuredVideos") continue;
    const featuredBlock = block as FeaturedVideosBlockData;
    const candidates = [
      featuredBlock.featuredVideo,
      ...(featuredBlock.videos ?? []),
    ].filter(Boolean) as VideoPostInput[];

    for (const video of candidates) {
      const id = video._id;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      collected.push(video);
    }
  }

  return collected;
}

/** Build VideoObject nodes for homepage featured videos (Google Rich Results). */
export function buildHomeVideoObjectNodes(
  blocks: PageBuilderBlock[] | null | undefined,
): Record<string, unknown>[] {
  const siteUrl = siteBaseUrl();
  const resolveThumb = (thumbnail: unknown) => sanityImageUrl(thumbnail, 1280);
  const nodes: Record<string, unknown>[] = [];

  for (const raw of collectVideosFromBlocks(blocks)) {
    const source = resolveVideoSource(raw, resolveThumb);
    if (!source || !isVideoJsonLdReady(source)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[home-jsonld] Skipping VideoObject — missing description, publishedAt, or thumbnail:",
          raw.title ?? raw._id,
        );
      }
      continue;
    }

    nodes.push(
      videoObject({
        id: source._id ? `${siteUrl}#video-${source._id}` : undefined,
        name: source.title,
        description: source.description,
        thumbnailUrl: source.thumbnailUrl,
        uploadDate: source.publishedAt,
        contentUrl: source.contentUrl,
        embedUrl: source.embedUrl,
        duration: displayDurationToIso8601(source.duration),
      }),
    );
  }

  return nodes;
}
