import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import type { BlockProps, FeaturedVideosBlock } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import { VideoCardInteractive } from "@/components/modules/video-card-interactive";
import {
  POST_ROW_DIELINE_BORDER_DEFAULTS,
  resolveDielineBorders,
} from "@/lib/dieline-borders";
import { resolveVideoSource, type ResolvedVideoSource } from "@/lib/resolve-video-source";
import { sanityImageBaseUrl } from "@/lib/sanity-image";
import { externalLinkAttributes } from "@/lib/external-link";

function uniqueGridVideos(
  leadId: string | undefined,
  videos: ResolvedVideoSource[],
): ResolvedVideoSource[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    const id = video._id ?? video.href;
    if (leadId && video._id === leadId) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * `featuredVideos` page-builder section — lead video plus a supporting grid.
 * Cards open in a new tab or an on-site dialog lightbox (editor-controlled).
 */
export function FeaturedVideos({
  heading,
  channelCtaLabel,
  channelCtaUrl,
  playbackMode,
  featuredVideo,
  videos,
  showTopBorder,
  showBottomBorder,
}: BlockProps<FeaturedVideosBlock>) {
  const resolveThumb = (thumbnail: unknown) => sanityImageBaseUrl(thumbnail);

  const lead = featuredVideo
    ? resolveVideoSource(featuredVideo, resolveThumb)
    : null;
  const gridVideos = uniqueGridVideos(
    lead?._id,
    (videos ?? [])
      .map((video) => resolveVideoSource(video, resolveThumb))
      .filter((video): video is NonNullable<typeof video> => video != null),
  );

  if (!lead) return null;

  const label = heading ?? "Featured Videos";
  const headingId = "featured-videos-heading";
  const mode = playbackMode ?? "newTab";
  const { borderTop, borderBottom } = resolveDielineBorders(
    showTopBorder,
    showBottomBorder,
    POST_ROW_DIELINE_BORDER_DEFAULTS,
  );

  return (
    <PageDielineFullBleedSection
      aria-labelledby={headingId}
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-8 lg:py-24"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2
          id={headingId}
          className="text-2xl font-semibold leading-tight tracking-tight lg:text-3xl"
        >
          {label}
        </h2>
        {channelCtaLabel && channelCtaUrl ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={channelCtaUrl} {...externalLinkAttributes(channelCtaUrl)}>
              {channelCtaLabel}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-10">
        <VideoCardInteractive video={lead} variant="lead" playbackMode={mode} />
        {gridVideos.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {gridVideos.map((video) => (
              <VideoCardInteractive
                key={video._id ?? video.href}
                video={video}
                variant="grid"
                playbackMode={mode}
              />
            ))}
          </div>
        ) : null}
      </div>
    </PageDielineFullBleedSection>
  );
}
