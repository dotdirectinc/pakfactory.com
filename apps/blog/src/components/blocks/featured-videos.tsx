import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import type { BlockProps, FeaturedVideosBlock } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import { VideoCard } from "@/components/modules/video-card";
import {
  POST_ROW_DIELINE_BORDER_DEFAULTS,
  resolveDielineBorders,
} from "@/lib/dieline-borders";
import { resolveVideoSource } from "@/lib/resolve-video-source";
import { sanityImageUrl } from "@/lib/sanity-image";

/**
 * `featuredVideos` page-builder section — lead video plus a supporting grid.
 * Cards link out to external platforms or hosted files (no iframe embed).
 */
export function FeaturedVideos({
  heading,
  channelCtaLabel,
  channelCtaUrl,
  featuredVideo,
  videos,
  showTopBorder,
  showBottomBorder,
}: BlockProps<FeaturedVideosBlock>) {
  const resolveThumb = (thumbnail: unknown) => sanityImageUrl(thumbnail, 1280);

  const lead = featuredVideo
    ? resolveVideoSource(featuredVideo, resolveThumb)
    : null;
  const gridVideos = (videos ?? [])
    .map((video) => resolveVideoSource(video, resolveThumb))
    .filter((video): video is NonNullable<typeof video> => video != null);

  if (!lead) return null;

  const label = heading ?? "Featured Videos";
  const headingId = "featured-videos-heading";
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
            <Link href={channelCtaUrl} target="_blank" rel="noopener noreferrer">
              {channelCtaLabel}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-10">
        <VideoCard video={lead} variant="lead" />
        {gridVideos.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {gridVideos.map((video) => (
              <VideoCard
                key={video._id ?? video.href}
                video={video}
                variant="grid"
              />
            ))}
          </div>
        ) : null}
      </div>
    </PageDielineFullBleedSection>
  );
}
