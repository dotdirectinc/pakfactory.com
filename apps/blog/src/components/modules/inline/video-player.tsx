"use client";

import { useState } from "react";

type VideoPlayerProps = {
  embedSrc: string;
  posterUrl?: string;
  title: string;
  /** Player aspect ratio. Portrait (9/16) is width-constrained and centered. */
  aspect?: "16/9" | "9/16";
};

/** Click-to-play poster → provider iframe. Keyboard-operable, privacy-friendly. */
export function VideoPlayer({
  embedSrc,
  posterUrl,
  title,
  aspect = "16/9",
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const portrait = aspect === "9/16";

  return (
    <div className={portrait ? "mx-auto w-full max-w-sm" : "w-full"}>
      <div
        className="relative w-full overflow-hidden rounded-lg bg-muted"
        style={{ aspectRatio: aspect }}
      >
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
              // Poster comes from arbitrary provider CDNs (ytimg, vimeocdn,
              // dmcdn, tiktokcdn) — a plain img avoids whitelisting every host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
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
    </div>
  );
}
