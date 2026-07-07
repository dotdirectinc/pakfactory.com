"use client";

import { useEffect, useRef } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { SocialProvider } from "@/lib/video-embed";

const SCRIPTS: Record<SocialProvider, { src: string; id: string }> = {
  twitter: { src: "https://platform.twitter.com/widgets.js", id: "twitter-wjs" },
  instagram: { src: "https://www.instagram.com/embed.js", id: "instagram-embed" },
};

// Instagram matches the vertical reel width (TikTok / FB reels); a tweet card
// keeps its natural width.
const WIDTH: Record<SocialProvider, string> = {
  instagram: "max-w-[400px]",
  twitter: "max-w-[550px]",
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
  title: string;
};

/**
 * Renders the native Twitter/X or Instagram embed directly (the platform card
 * shows its own preview/thumbnail). Its SDK is loaded on mount and asked to
 * process the blockquote.
 */
export function SocialVideoEmbed({ provider, url, title }: SocialVideoEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [provider, url]);

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full",
        WIDTH[provider],
        "[&_.instagram-media]:!mx-auto [&_.twitter-tweet]:!mx-auto",
      )}
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
