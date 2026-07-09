"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@pakfactory/ui/components/dialog";
import type { ResolvedVideoSource } from "@/lib/resolve-video-source";
import { externalLinkAttributes } from "@/lib/external-link";
import { VideoPlayer } from "@/components/modules/inline/video-player";

type VideoLightboxDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: ResolvedVideoSource;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  dailymotion: "Dailymotion",
  tiktok: "TikTok",
  facebook: "Facebook",
  hosted: "source",
  other: "source",
};

function platformLabel(platform?: string): string {
  if (!platform) return "source";
  return PLATFORM_LABELS[platform] ?? platform;
}

export function VideoLightboxDialog({
  open,
  onOpenChange,
  video,
}: VideoLightboxDialogProps) {
  const label = platformLabel(video.platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">{video.title}</DialogTitle>

        <div className="bg-black">
          {video.playbackKind === "hosted" ? (
            <video
              controls
              className="aspect-video w-full"
              src={video.contentUrl}
              title={video.title}
            />
          ) : video.playbackKind === "iframe" && video.embedSrc ? (
            <VideoPlayer
              embedSrc={video.embedSrc}
              posterUrl={video.thumbnailUrl}
              title={video.title}
              aspect={video.aspect ?? "16/9"}
              autoShow
            />
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-between">
          <p className="text-sm font-semibold text-foreground">{video.title}</p>
          <Link
            href={video.href}
            {...externalLinkAttributes(video.href)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Watch on {label}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
