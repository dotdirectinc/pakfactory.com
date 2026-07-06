"use client";

import { useState } from "react";
import Image from "next/image";

type VideoPlayerProps = {
  embedSrc: string;
  posterUrl?: string;
  title: string;
};

/** Click-to-play poster → provider iframe. Keyboard-operable, privacy-friendly. */
export function VideoPlayer({ embedSrc, posterUrl, title }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
      {playing ? (
        <iframe
          src={embedSrc}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label={`Play video: ${title}`}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          ) : null}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-background/90 shadow-md transition group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="ml-1 size-7 fill-foreground"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
