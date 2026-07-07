"use client";

import { useEffect, useRef, useState } from "react";
import type { SocialProvider } from "@/lib/video-embed";

const SCRIPTS: Record<SocialProvider, { src: string; id: string }> = {
  twitter: { src: "https://platform.twitter.com/widgets.js", id: "twitter-wjs" },
  instagram: { src: "https://www.instagram.com/embed.js", id: "instagram-embed" },
};

const LABEL: Record<SocialProvider, string> = {
  twitter: "post on X",
  instagram: "Instagram post",
};

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });
}

type SocialVideoEmbedProps = {
  provider: SocialProvider;
  url: string;
  posterUrl?: string;
  title: string;
};

/**
 * Click-to-load embed for platforms without a clean iframe (Twitter/X,
 * Instagram). The third-party SDK only loads after the reader opts in
 * (privacy + performance); the platform then renders its own card.
 */
export function SocialVideoEmbed({
  provider,
  url,
  posterUrl,
  title,
}: SocialVideoEmbedProps) {
  // With no poster (e.g. Instagram — no keyless thumbnail), auto-load the native
  // card so its own thumbnail shows from the start. With a poster (e.g. Twitter
  // syndication thumbnail), stay click-gated so nothing third-party loads early.
  const [loaded, setLoaded] = useState(!posterUrl);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) return;
    const { src, id } = SCRIPTS[provider];
    let cancelled = false;
    void loadScript(src, id).then(() => {
      if (cancelled) return;
      if (provider === "twitter") {
        (
          window as unknown as {
            twttr?: { widgets?: { load: (el?: HTMLElement | null) => void } };
          }
        ).twttr?.widgets?.load(ref.current);
      } else {
        (
          window as unknown as { instgrm?: { Embeds?: { process: () => void } } }
        ).instgrm?.Embeds?.process();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, provider]);

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted"
        aria-label={`Load ${LABEL[provider]}: ${title}`}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span className="relative z-10 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-16 items-center justify-center rounded-full bg-background/90 shadow-md transition group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="ml-1 size-7 fill-foreground"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          Load {LABEL[provider]}
        </span>
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="[&_.instagram-media]:!mx-auto [&_.twitter-tweet]:!mx-auto"
    >
      {provider === "twitter" ? (
        <blockquote className="twitter-tweet" data-dnt="true">
          <a href={url}>{title}</a>
        </blockquote>
      ) : (
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
        >
          <a href={url}>{title}</a>
        </blockquote>
      )}
    </div>
  );
}
