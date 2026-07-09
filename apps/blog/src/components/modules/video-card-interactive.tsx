"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";
import type { ResolvedVideoSource } from "@/lib/resolve-video-source";
import { externalLinkAttributes } from "@/lib/external-link";
import { VideoCard, VideoCardThumbnail } from "@/components/modules/video-card";
import { VideoLightboxDialog } from "@/components/ui/video-lightbox-dialog";

type VideoCardInteractiveProps = {
  video: ResolvedVideoSource;
  variant?: "lead" | "grid";
  playbackMode?: "newTab" | "dialog";
  className?: string;
};

function useDialogPlayback(
  playbackMode: "newTab" | "dialog",
  video: ResolvedVideoSource,
): boolean {
  return playbackMode === "dialog" && video.playbackKind !== "linkOnly";
}

export function VideoCardInteractive({
  video,
  variant = "grid",
  playbackMode = "newTab",
  className,
}: VideoCardInteractiveProps) {
  const [open, setOpen] = useState(false);
  const dialogPlayback = useDialogPlayback(playbackMode, video);

  if (dialogPlayback) {
    const triggerClassName =
      "relative block w-full overflow-hidden rounded-xl bg-secondary text-left";

    return (
      <>
        <VideoCard
          video={video}
          variant={variant}
          className={className}
          thumbnailAction={
            <VideoCardThumbnail
              video={video}
              variant={variant}
              wrapper={(content) => (
                <button
                  type="button"
                  className={triggerClassName}
                  aria-label={`Play video: ${video.title}`}
                  onClick={() => setOpen(true)}
                >
                  {content}
                </button>
              )}
            />
          }
          titleAction={
            <button
              type="button"
              className="text-left hover:underline"
              onClick={() => setOpen(true)}
            >
              {video.title}
            </button>
          }
        />
        <VideoLightboxDialog open={open} onOpenChange={setOpen} video={video} />
      </>
    );
  }

  const linkClassName = cn(
    "relative block overflow-hidden rounded-xl bg-secondary",
  );

  return (
    <VideoCard
      video={video}
      variant={variant}
      className={className}
      thumbnailAction={
        <VideoCardThumbnail
          video={video}
          variant={variant}
          wrapper={(content) => (
            <Link
              href={video.href}
              {...externalLinkAttributes(video.href)}
              className={linkClassName}
              aria-label={`Watch video: ${video.title}`}
            >
              {content}
            </Link>
          )}
        />
      }
      titleAction={
        <Link
          href={video.href}
          {...externalLinkAttributes(video.href)}
          className="hover:underline"
        >
          {video.title}
        </Link>
      }
    />
  );
}
