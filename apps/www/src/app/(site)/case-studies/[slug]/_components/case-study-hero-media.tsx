"use client";

import type { CaseStudyHeroMedia as HeroMediaData } from "@pakfactory/sanity/queries";
import { SanityImage } from "@/components/ui/sanity-image";
import { VideoFacade } from "@/components/ui/video-facade";
import { getYouTubeId } from "@/lib/youtube";

type Props = {
  heroMedia: HeroMediaData;
  title: string;
};

export function CaseStudyHeroMedia({ heroMedia, title }: Props) {
  if (heroMedia.mediaType === "image" && heroMedia.imageUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
        <SanityImage
          src={heroMedia.imageUrl}
          alt={heroMedia.alt ?? title}
          applyWatermark={false}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1280px"
          priority
        />
      </div>
    );
  }

  if (heroMedia.mediaType === "video" && heroMedia.videoUrl) {
    const videoId = getYouTubeId(heroMedia.videoUrl);
    const thumbnailUrl =
      heroMedia.videoThumbnailUrl ??
      (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null);

    return (
      <VideoFacade
        videoUrl={heroMedia.videoUrl}
        thumbnailUrl={thumbnailUrl}
        title={title}
        alt={heroMedia.alt}
        priority
      />
    );
  }

  return null;
}
