"use client";

import Image from "next/image";
import { useState } from "react";
import type { CaseStudyHeroMedia as HeroMediaData } from "@pakfactory/sanity/queries";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

type Props = {
  heroMedia: HeroMediaData;
  title: string;
};

export function CaseStudyHeroMedia({ heroMedia, title }: Props) {
  const [playing, setPlaying] = useState(false);

  if (heroMedia.mediaType === "image" && heroMedia.imageUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
        <Image
          src={heroMedia.imageUrl}
          alt={heroMedia.alt ?? title}
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

    if (playing && videoId) {
      return (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={title}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary"
        aria-label={`Play video: ${title}`}
      >
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={heroMedia.alt ?? title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 1280px"
            priority
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
          <div className="flex size-20 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-9 translate-x-0.5"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </button>
    );
  }

  return null;
}
